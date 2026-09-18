package io.backend.lined.ratelimit;

/** Result of one atomic token-bucket admission attempt. */
public record RateLimitDecision(boolean allowed, long nanosToWait) {

  private static final long NANOS_PER_SECOND = 1_000_000_000L;

  /** Validates the non-negative wait duration returned by the bucket implementation. */
  public RateLimitDecision {
    if (nanosToWait < 0) {
      throw new IllegalArgumentException("Rate-limit wait duration cannot be negative");
    }
  }

  /** Returns a positive whole-second retry delay without overflowing on large durations.
   *
   * @return retry delay in seconds, rounded up and clamped to at least one
   */
  public long retryAfterSeconds() {
    long seconds = nanosToWait / NANOS_PER_SECOND;
    if (nanosToWait % NANOS_PER_SECOND != 0 && seconds < Long.MAX_VALUE) {
      seconds++;
    }
    return Math.max(1, seconds);
  }
}
