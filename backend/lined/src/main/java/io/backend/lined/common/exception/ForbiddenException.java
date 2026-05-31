package io.backend.lined.common.exception;

import org.springframework.http.HttpStatus;

public class ForbiddenException extends BaseAppException {

  public ForbiddenException(String message) {
    super(HttpStatus.FORBIDDEN, "common.forbidden", message);
  }
}
