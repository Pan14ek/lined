package io.backend.lined.ratelimit;

import static org.assertj.core.api.Assertions.assertThat;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class InMemoryRateLimitStoreTest {

  private InMemoryRateLimitStore store;
  private RateLimitPolicy policy;

  @BeforeEach
  void setUp() {
    RateLimitProperties properties = new RateLimitProperties();
    properties.setMaxKeys(4);
    properties.setKeyTtl(Duration.ofHours(2));
    properties.setKeySecret("test-rate-limit-key-secret-with-at-least-32-bytes");
    store = new InMemoryRateLimitStore(properties, new SimpleMeterRegistry());
    store.initialize();
    policy = new RateLimitPolicy("test", 3, Duration.ofMinutes(1));
  }

  @Test
  void tryConsume_enforcesBurstAndReturnsPositiveWait() {
    assertThat(store.tryConsume(policy, "same").allowed()).isTrue();
    assertThat(store.tryConsume(policy, "same").allowed()).isTrue();
    assertThat(store.tryConsume(policy, "same").allowed()).isTrue();

    RateLimitDecision rejected = store.tryConsume(policy, "same");
    assertThat(rejected.allowed()).isFalse();
    assertThat(rejected.retryAfterSeconds()).isGreaterThanOrEqualTo(1);
  }

  @Test
  void concurrentConsumption_neverExceedsConfiguredCapacity() throws Exception {
    ExecutorService executor = Executors.newFixedThreadPool(8);
    CountDownLatch start = new CountDownLatch(1);
    AtomicInteger allowed = new AtomicInteger();
    List<Future<?>> futures = new ArrayList<>();
    try {
      for (int index = 0; index < 40; index++) {
        futures.add(executor.submit(() -> {
          await(start);
          if (store.tryConsume(policy, "concurrent").allowed()) {
            allowed.incrementAndGet();
          }
        }));
      }
      start.countDown();
      for (Future<?> future : futures) {
        future.get(5, TimeUnit.SECONDS);
      }
    } finally {
      executor.shutdown();
      assertThat(executor.awaitTermination(5, TimeUnit.SECONDS)).isTrue();
    }
    assertThat(allowed).hasValue(3);
  }

  @Test
  void capacityPressure_failsClosedInsteadOfEvictingSensitiveState() {
    for (int index = 0; index < 4; index++) {
      store.tryConsume(policy, "key-" + index);
    }

    org.assertj.core.api.Assertions.assertThatThrownBy(
        () -> store.tryConsume(policy, "new-key"))
        .isInstanceOf(RateLimitStorageException.class);
  }

  private void await(CountDownLatch latch) {
    try {
      if (!latch.await(5, TimeUnit.SECONDS)) {
        throw new AssertionError("Concurrent test did not start in time");
      }
    } catch (InterruptedException ex) {
      Thread.currentThread().interrupt();
      throw new AssertionError(ex);
    }
  }
}
