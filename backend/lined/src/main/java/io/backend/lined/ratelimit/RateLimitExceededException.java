package io.backend.lined.ratelimit;

import io.backend.lined.common.exception.BaseAppException;
import org.springframework.http.HttpStatus;

/** Generic external admission rejection without identifying the exhausted dimension. */
public class RateLimitExceededException extends BaseAppException {

  private final long retryAfterSeconds;

  public RateLimitExceededException(long retryAfterSeconds) {
    super(HttpStatus.TOO_MANY_REQUESTS, "rate_limit.exceeded", "Please try again later.");
    this.retryAfterSeconds = Math.max(1, retryAfterSeconds);
  }

  public long getRetryAfterSeconds() {
    return retryAfterSeconds;
  }
}
