package io.backend.lined.ratelimit;

import java.time.Duration;

/** One named token-bucket policy. */
public record RateLimitPolicy(String id, long capacity, Duration period) {

  public RateLimitPolicy {
    if (id == null || id.isBlank() || capacity <= 0 || period == null || period.isNegative()
        || period.isZero()) {
      throw new IllegalArgumentException("Rate-limit policy is invalid");
    }
  }
}
