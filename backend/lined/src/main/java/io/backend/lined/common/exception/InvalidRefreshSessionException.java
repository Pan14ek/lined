package io.backend.lined.common.exception;

import org.springframework.http.HttpStatus;

/** Reports a generic refresh-session failure without revealing token history state. */
public class InvalidRefreshSessionException extends BaseAppException {

  public InvalidRefreshSessionException() {
    super(HttpStatus.UNAUTHORIZED, "auth.session.invalid", "Invalid refresh session.");
  }
}
