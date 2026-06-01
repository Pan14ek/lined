package io.backend.lined.common.exception;

import org.springframework.http.HttpStatus;

public class BadRequestException extends BaseAppException {

  public BadRequestException(String message) {
    super(HttpStatus.BAD_REQUEST, "common.bad_request", message);
  }
}
