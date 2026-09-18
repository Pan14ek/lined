package io.backend.lined.ratelimit;

/** Signals that a mandatory limiter decision could not be evaluated safely. */
public class RateLimitStorageException extends RuntimeException {

  /** Creates a storage failure with a safe diagnostic message.
   *
   * @param message safe diagnostic message
   */
  public RateLimitStorageException(String message) {
    super(message);
  }

  /** Creates a storage failure with a safe diagnostic message and cause.
   *
   * @param message safe diagnostic message
   * @param cause underlying allocation or storage failure
   */
  public RateLimitStorageException(String message, Throwable cause) {
    super(message, cause);
  }
}
