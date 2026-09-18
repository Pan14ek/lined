package io.backend.lined.ratelimit;

/** Signals that a mandatory limiter decision could not be evaluated safely. */
public class RateLimitStorageException extends RuntimeException {

  public RateLimitStorageException(String message) {
    super(message);
  }

  public RateLimitStorageException(String message, Throwable cause) {
    super(message, cause);
  }
}
