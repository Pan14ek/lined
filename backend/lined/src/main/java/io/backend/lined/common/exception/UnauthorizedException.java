package io.backend.lined.common.exception;

import org.springframework.http.HttpStatus;

public class UnauthorizedException extends BaseAppException {

  public UnauthorizedException(String message) {
    super(HttpStatus.UNAUTHORIZED, "common.unauthorized", message);
  }
}
