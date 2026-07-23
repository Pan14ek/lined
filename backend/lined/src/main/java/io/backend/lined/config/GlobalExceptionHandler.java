package io.backend.lined.config;

import io.backend.lined.common.exception.BaseAppException;
import jakarta.validation.ConstraintViolationException;
import java.net.URI;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(BaseAppException.class)
  public ResponseEntity<ProblemDetail> handleBase(BaseAppException ex) {
    ProblemDetail pd = ProblemDetail.forStatusAndDetail(ex.getStatus(), ex.getMessage());
    pd.setTitle(switch (ex.getStatus()) {
      case NOT_FOUND -> "Resource not found";
      case CONFLICT -> "Conflict";
      case BAD_REQUEST -> "Bad request";
      case FORBIDDEN -> "Forbidden";
      case UNAUTHORIZED -> "Unauthorized";
      default -> ex.getStatus().getReasonPhrase();
    });
    pd.setType(URI.create("https://errors.lined.app/" + ex.getCode()));
    pd.setProperty("code", ex.getCode());
    return ResponseEntity.status(ex.getStatus()).body(pd);
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ProblemDetail> handleValidation(MethodArgumentNotValidException ex) {
    ProblemDetail pd =
        ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Validation failed");
    pd.setTitle("Validation error");
    pd.setProperty("errors", ex.getBindingResult().getFieldErrors().stream()
        .map(fe -> fe.getField() + ": " + fe.getDefaultMessage()).toList());
    return ResponseEntity.badRequest().body(pd);
  }

  @ExceptionHandler(ConstraintViolationException.class)
  public ResponseEntity<ProblemDetail> handleConstraint(ConstraintViolationException ex) {
    ProblemDetail pd =
        ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Constraint violation");
    pd.setTitle("Validation error");
    pd.setProperty("errors", ex.getConstraintViolations().stream()
        .map(v -> v.getPropertyPath() + ": " + v.getMessage()).toList());
    return ResponseEntity.badRequest().body(pd);
  }

  @ExceptionHandler(MethodArgumentTypeMismatchException.class)
  public ResponseEntity<ProblemDetail> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
    ProblemDetail pd = ProblemDetail.forStatusAndDetail(
        HttpStatus.BAD_REQUEST, "Invalid request parameter: " + ex.getName());
    pd.setTitle("Bad request");
    return ResponseEntity.badRequest().body(pd);
  }

  @ExceptionHandler(MissingRequestHeaderException.class)
  public ResponseEntity<ProblemDetail> handleMissingRequestHeader(MissingRequestHeaderException ex) {
    ProblemDetail pd = ProblemDetail.forStatusAndDetail(
        HttpStatus.BAD_REQUEST, "Missing required request header: " + ex.getHeaderName());
    pd.setTitle("Bad request");
    return ResponseEntity.badRequest().body(pd);
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  public ResponseEntity<ProblemDetail> handleDataIntegrity(DataIntegrityViolationException ex) {
    ProblemDetail pd =
        ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, "Data integrity violation");
    pd.setTitle("Conflict");
    return ResponseEntity.status(HttpStatus.CONFLICT).body(pd);
  }

  @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
  public ResponseEntity<ProblemDetail> handleOptimisticLock(
      ObjectOptimisticLockingFailureException ex) {
    ProblemDetail pd = ProblemDetail.forStatusAndDetail(
        HttpStatus.CONFLICT, "Resource has been modified; fetch the latest version and retry");
    pd.setTitle("Conflict");
    pd.setType(URI.create("https://errors.lined.app/common.conflict"));
    return ResponseEntity.status(HttpStatus.CONFLICT).body(pd);
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ProblemDetail> handleOther(Exception ex) {
    ProblemDetail pd =
        ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, "Unexpected error");
    pd.setTitle("Internal Server Error");
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(pd);
  }

}
