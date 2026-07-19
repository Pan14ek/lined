package io.backend.lined.common.exception;

import org.springframework.http.HttpStatus;

public class PreconditionRequiredException extends BaseAppException {

  public PreconditionRequiredException(String message) {
    super(HttpStatus.PRECONDITION_REQUIRED, "common.precondition_required", message);
  }
}
