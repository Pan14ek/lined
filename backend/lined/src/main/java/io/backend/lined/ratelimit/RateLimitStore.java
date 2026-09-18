package io.backend.lined.ratelimit;

/** Storage seam for local buckets and a future coordinated implementation. */
public interface RateLimitStore {

  /** Atomically attempts to consume one token from a policy bucket.
   *
   * @param policy bucket policy
   * @param key opaque dimension key
   * @return admission decision and refill wait duration
   */
  RateLimitDecision tryConsume(RateLimitPolicy policy, String key);

  /** Removes one opaque bucket, typically after successful authentication.
   *
   * @param policy bucket policy
   * @param key opaque dimension key
   */
  void remove(RateLimitPolicy policy, String key);

  /** Returns the current number of stored buckets.
   *
   * @return current bucket count
   */
  long entryCount();

  /** Returns the configured maximum number of stored buckets.
   *
   * @return bucket capacity
   */
  long capacity();
}
