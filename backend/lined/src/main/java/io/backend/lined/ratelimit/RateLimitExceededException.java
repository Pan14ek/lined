package io.backend.lined.ratelimit;

import io.backend.lined.common.exception.BaseAppException;
import org.springframework.http.HttpStatus;

/** Generic external admission rejection without identifying the exhausted dimension. */
public class RateLimitExceededException extends BaseAppException {

  private final long retryAfterSeconds;

  /** Creates the generic 429 domain exception.
   *
   * @param retryAfterSeconds whole-second retry delay
   */
  public RateLimitExceededException(long retryAfterSeconds) {
    super(HttpStatus.TOO_MANY_REQUESTS, "rate_limit.exceeded", "Please try again later.");
    this.retryAfterSeconds = Math.max(1, retryAfterSeconds);
  }

  /** Returns the retry delay exposed by the API contract.
   *
   * @return positive retry delay in seconds
   */
  public long getRetryAfterSeconds() {
    return retryAfterSeconds;
  }
}
