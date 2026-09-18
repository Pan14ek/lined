package io.backend.lined.ratelimit;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bucket;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import java.time.Duration;
import java.util.concurrent.locks.ReentrantLock;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Bounded, single-instance Bucket4j storage backed by Caffeine. */
@Component
@RequiredArgsConstructor
public class InMemoryRateLimitStore implements RateLimitStore {

  private final RateLimitProperties properties;
  private final MeterRegistry meterRegistry;
  private final ReentrantLock creationLock = new ReentrantLock();
  private Cache<String, Bucket> buckets;

  @jakarta.annotation.PostConstruct
  void initialize() {
    Duration ttl = properties.getKeyTtl();
    buckets = Caffeine.newBuilder()
        .maximumSize(properties.getMaxKeys())
        .expireAfterWrite(ttl)
        .build();
    Gauge.builder("lined.rate_limit.cache.entries", this, InMemoryRateLimitStore::entryCount)
        .register(meterRegistry);
    Gauge.builder("lined.rate_limit.cache.capacity", this, InMemoryRateLimitStore::capacity)
        .register(meterRegistry);
  }

  @Override
  public RateLimitDecision tryConsume(RateLimitPolicy policy, String key) {
    Bucket bucket = bucket(policy, key);
    var probe = bucket.tryConsumeAndReturnRemaining(1);
    return new RateLimitDecision(probe.isConsumed(), probe.getNanosToWaitForRefill());
  }

  @Override
  public void remove(RateLimitPolicy policy, String key) {
    buckets.invalidate(cacheKey(policy, key));
  }

  @Override
  public long entryCount() {
    return buckets == null ? 0 : buckets.estimatedSize();
  }

  @Override
  public long capacity() {
    return properties.getMaxKeys();
  }

  private Bucket bucket(RateLimitPolicy policy, String key) {
    String cacheKey = cacheKey(policy, key);
    Bucket existing = buckets.getIfPresent(cacheKey);
    if (existing != null) {
      return existing;
    }
    creationLock.lock();
    try {
      existing = buckets.getIfPresent(cacheKey);
      if (existing != null) {
        return existing;
      }
      if (buckets.estimatedSize() >= properties.getMaxKeys()) {
        throw new RateLimitStorageException("Rate-limit key capacity reached");
      }
      return buckets.get(cacheKey, ignored -> newBucket(policy));
    } catch (RateLimitStorageException ex) {
      throw ex;
    } catch (RuntimeException ex) {
      throw new RateLimitStorageException("Rate-limit bucket allocation failed", ex);
    } finally {
      creationLock.unlock();
    }
  }

  private Bucket newBucket(RateLimitPolicy policy) {
    return Bucket.builder()
        .addLimit(limit -> limit.capacity(policy.capacity()).refillGreedy(
            policy.capacity(), policy.period()))
        .build();
  }

  private String cacheKey(RateLimitPolicy policy, String key) {
    return policy.id() + ':' + key;
  }
}
