package io.backend.lined.featureflag.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;

class FeatureFlagSnapshotTest {

  private static final Map<String, Boolean> FIRST = Map.of("calendar", true, "tasks", false);
  private static final Map<String, Boolean> SECOND = Map.of("calendar", false, "tasks", true);

  @Test
  void isEnabled_readsCachedValuesAndFailsClosedForUnknownKeys() {
    var snapshot = new FeatureFlagSnapshot();
    snapshot.replaceAll(FIRST);

    assertThat(snapshot.isEnabled("calendar")).isTrue();
    assertThat(snapshot.isEnabled("tasks")).isFalse();
    assertThat(snapshot.isEnabled("unknown")).isFalse();
  }

  @Test
  void replaceAll_removesStaleEntries() {
    var snapshot = new FeatureFlagSnapshot();
    snapshot.replaceAll(Map.of("calendar", true, "legacy", true));

    snapshot.replaceAll(FIRST);

    assertThat(snapshot.snapshot()).isEqualTo(FIRST);
    assertThat(snapshot.isEnabled("legacy")).isFalse();
  }

  @Test
  void update_changesOnlyOneKey() {
    var snapshot = new FeatureFlagSnapshot();
    snapshot.replaceAll(FIRST);

    snapshot.update("calendar", false);

    assertThat(snapshot.snapshot()).containsEntry("calendar", false).containsEntry("tasks", false);
  }

  @Test
  void snapshot_returnsAnImmutableMap() {
    var snapshot = new FeatureFlagSnapshot();
    snapshot.replaceAll(FIRST);

    assertThatThrownBy(() -> snapshot.snapshot().put("calendar", false))
        .isInstanceOf(UnsupportedOperationException.class);
  }

  @Test
  void replaceAll_concurrentReadersObserveOnlyCompleteSnapshots() throws Exception {
    var snapshot = new FeatureFlagSnapshot();
    snapshot.replaceAll(FIRST);
    var start = new CountDownLatch(1);
    ExecutorService executor = Executors.newFixedThreadPool(5);
    try {
      List<Callable<Void>> readers = List.of(reader(snapshot, start), reader(snapshot, start),
          reader(snapshot, start), reader(snapshot, start));
      var writer = executor.submit((Callable<Void>) () -> {
        replaceSnapshots(snapshot, start);
        return null;
      });
      var futures = readers.stream().map(executor::submit).toList();
      start.countDown();
      writer.get(10, TimeUnit.SECONDS);
      for (var future : futures) {
        future.get(10, TimeUnit.SECONDS);
      }
    } finally {
      executor.shutdownNow();
    }
  }

  private Callable<Void> reader(FeatureFlagSnapshot snapshot, CountDownLatch start) {
    return () -> {
      start.await();
      for (int index = 0; index < 2_000; index++) {
        assertThat(snapshot.snapshot()).isIn(FIRST, SECOND);
      }
      return null;
    };
  }

  private void replaceSnapshots(FeatureFlagSnapshot snapshot, CountDownLatch start)
      throws InterruptedException {
    start.await();
    for (int index = 0; index < 2_000; index++) {
      snapshot.replaceAll(index % 2 == 0 ? SECOND : FIRST);
    }
  }
}
