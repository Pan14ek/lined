package io.backend.lined.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Signals that a previously valid resource has been intentionally retired.
 *
 * <p>For example, a calendar client using a revoked secret feed URL receives {@code 410 Gone},
 * which tells it to remove the subscription instead of repeatedly retrying authentication.</p>
 */
public class GoneException extends BaseAppException {

  /**
   * Creates a retired-resource error with Lined's RFC 7807 error code.
   *
   * <p>For example, {@code new GoneException("Calendar feed has been revoked")} is translated by
   * the global exception handler into a {@code 410 Gone} problem response.</p>
   *
   * @param message safe explanation for the client
   */
  public GoneException(String message) {
    super(HttpStatus.GONE, "common.gone", message);
  }
}
