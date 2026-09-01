package io.backend.lined.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Reports an intentionally non-enumerating credential authentication failure.
 */
public class InvalidCredentialsException extends BaseAppException {

  private static final String MESSAGE = "Invalid email, username, or password.";

  public InvalidCredentialsException() {
    super(HttpStatus.UNAUTHORIZED, "auth.credentials.invalid", MESSAGE);
  }
}
