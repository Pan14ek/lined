package io.backend.lined.common.exception;

import org.springframework.http.HttpStatus;

public class NotFoundException extends BaseAppException {

  public NotFoundException(String message) {
    super(HttpStatus.NOT_FOUND, "common.not_found", message);
  }
}
