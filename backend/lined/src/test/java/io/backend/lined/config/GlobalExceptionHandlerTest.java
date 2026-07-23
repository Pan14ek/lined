package io.backend.lined.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import io.backend.lined.common.exception.BadRequestException;
import io.backend.lined.common.exception.ConflictException;
import io.backend.lined.common.exception.ForbiddenException;
import io.backend.lined.common.exception.NotFoundException;
import io.backend.lined.common.exception.UnauthorizedException;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;

class GlobalExceptionHandlerTest {

  private GlobalExceptionHandler handler;

  @BeforeEach
  void setUp() {
    handler = new GlobalExceptionHandler();
  }

  @Test
  void handleBase_notFound_returns404WithCorrectTitle() {
    var ex = new NotFoundException("User 99 not found");

    ResponseEntity<ProblemDetail> response = handler.handleBase(ex);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    assertThat(response.getBody()).isNotNull();
    assertThat(response.getBody().getTitle()).isEqualTo("Resource not found");
    assertThat(response.getBody().getDetail()).isEqualTo("User 99 not found");
    assertThat(response.getBody().getType().toString()).contains("common.not_found");
  }

  @Test
  void handleBase_conflict_returns409WithCorrectTitle() {
    var ex = new ConflictException("Username already taken");

    ResponseEntity<ProblemDetail> response = handler.handleBase(ex);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    assertThat(response.getBody()).isNotNull();
    assertThat(response.getBody().getTitle()).isEqualTo("Conflict");
  }

  @Test
  void handleBase_conflict_includesStableCodeExtension() {
    var ex = new ConflictException("LOBBY_LIMIT_EXCEEDED", "Lobby limit exceeded");

    ResponseEntity<ProblemDetail> response = handler.handleBase(ex);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    assertThat(response.getBody()).isNotNull();
    assertThat(response.getBody().getProperties())
        .containsEntry("code", "LOBBY_LIMIT_EXCEEDED");
  }

  @Test
  void handleBase_badRequest_returns400WithCorrectTitle() {
    var ex = new BadRequestException("Start must be before end");

    ResponseEntity<ProblemDetail> response = handler.handleBase(ex);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    assertThat(response.getBody()).isNotNull();
    assertThat(response.getBody().getTitle()).isEqualTo("Bad request");
  }

  @Test
  void handleBase_forbidden_returns403WithCorrectTitle() {
    var ex = new ForbiddenException("Not a lobby member");

    ResponseEntity<ProblemDetail> response = handler.handleBase(ex);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    assertThat(response.getBody()).isNotNull();
    assertThat(response.getBody().getTitle()).isEqualTo("Forbidden");
  }

  @Test
  void handleBase_unauthorized_returns401WithCorrectTitle() {
    var ex = new UnauthorizedException("Invalid email, username, or password");

    ResponseEntity<ProblemDetail> response = handler.handleBase(ex);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    assertThat(response.getBody()).isNotNull();
    assertThat(response.getBody().getTitle()).isEqualTo("Unauthorized");
  }

  @Test
  void handleValidation_returns400WithErrorsProperty() {
    MethodArgumentNotValidException ex = mock(MethodArgumentNotValidException.class);
    BindingResult bindingResult = mock(BindingResult.class);
    FieldError fieldError = new FieldError("obj", "email", "must be a valid email");
    when(ex.getBindingResult()).thenReturn(bindingResult);
    when(bindingResult.getFieldErrors()).thenReturn(List.of(fieldError));

    ResponseEntity<ProblemDetail> response = handler.handleValidation(ex);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    ProblemDetail body = Objects.requireNonNull(response.getBody());
    assertThat(body.getTitle()).isEqualTo("Validation error");
    Map<String, Object> properties = Objects.requireNonNull(body.getProperties());
    assertThat(properties).containsKey("errors");
    @SuppressWarnings("unchecked")
    List<String> errors = (List<String>) properties.get("errors");
    assertThat(errors).anyMatch(e -> e.contains("email"));
  }

  @Test
  void handleConstraint_returns400WithErrorsProperty() {
    ConstraintViolation<?> violation = mock(ConstraintViolation.class);
    jakarta.validation.Path path = mock(jakarta.validation.Path.class);
    when(path.toString()).thenReturn("name");
    when(violation.getPropertyPath()).thenReturn(path);
    when(violation.getMessage()).thenReturn("must not be blank");
    var ex = new ConstraintViolationException(Set.of(violation));

    ResponseEntity<ProblemDetail> response = handler.handleConstraint(ex);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    assertThat(response.getBody()).isNotNull();
    assertThat(response.getBody().getTitle()).isEqualTo("Validation error");
    assertThat(response.getBody().getProperties()).containsKey("errors");
  }

  @Test
  void handleDataIntegrity_returns409() {
    var ex = new DataIntegrityViolationException("Duplicate key");

    ResponseEntity<ProblemDetail> response = handler.handleDataIntegrity(ex);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    assertThat(response.getBody()).isNotNull();
    assertThat(response.getBody().getTitle()).isEqualTo("Conflict");
  }

  @Test
  void handleOptimisticLock_returnsRfc7807Conflict() {
    var ex = new ObjectOptimisticLockingFailureException("events", 101L);

    ResponseEntity<ProblemDetail> response = handler.handleOptimisticLock(ex);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    assertThat(response.getBody()).isNotNull();
    assertThat(response.getBody().getTitle()).isEqualTo("Conflict");
    assertThat(response.getBody().getType().toString()).endsWith("common.conflict");
  }

  @Test
  void handleOther_returns500() {
    var ex = new RuntimeException("Unexpected");

    ResponseEntity<ProblemDetail> response = handler.handleOther(ex);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
    assertThat(response.getBody()).isNotNull();
    assertThat(response.getBody().getTitle()).isEqualTo("Internal Server Error");
  }
}
