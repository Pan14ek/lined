package io.backend.lined.ratelimit;

import io.backend.lined.common.exception.BaseAppException;
import org.springframework.http.HttpStatus;

/** Generic response for a mandatory limiter decision that failed internally. */
public class RateLimitUnavailableException extends BaseAppException {

  public RateLimitUnavailableException() {
    super(HttpStatus.SERVICE_UNAVAILABLE, "rate_limit.unavailable", "Service temporarily unavailable.");
  }
}
