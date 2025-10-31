package io.backend.lined.common.exception;

import org.springframework.http.HttpStatus;

public class BaseAppException extends RuntimeException {

  private final HttpStatus status;
  private final String code;

  protected BaseAppException(HttpStatus status, String code, String message) {
    super(message);
    this.status = status;
    this.code = code;
  }

  public HttpStatus getStatus() {
    return status;
  }

  public String getCode() {
    return code;
  }

}
