package io.backend.lined.ratelimit;

/** Storage seam for local buckets and a future coordinated implementation. */
public interface RateLimitStore {

  RateLimitDecision tryConsume(RateLimitPolicy policy, String key);

  void remove(RateLimitPolicy policy, String key);

  long entryCount();

  long capacity();
}
