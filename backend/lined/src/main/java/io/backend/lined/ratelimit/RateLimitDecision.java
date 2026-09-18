package io.backend.lined.ratelimit;

/** Result of one atomic token-bucket admission attempt. */
public record RateLimitDecision(boolean allowed, long nanosToWait) {

  public long retryAfterSeconds() {
    return Math.max(1, (nanosToWait + 999_999_999L) / 1_000_000_000L);
  }
}
