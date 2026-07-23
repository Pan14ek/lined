package io.backend.lined.common.exception;

import org.springframework.http.HttpStatus;

public class ConflictException extends BaseAppException {

  /**
   * Creates a conflict with the generic application error code.
   *
   * <p>For example, {@code new ConflictException("Username already taken")} produces a
   * {@code 409} response whose {@code code} is {@code common.conflict}. Use the overload with an
   * explicit error code when a client must distinguish a stable business conflict.</p>
   *
   * @param message explanation suitable for the RFC 7807 response detail
   */
  public ConflictException(String message) {
    super(HttpStatus.CONFLICT, "common.conflict", message);
  }

  /**
   * Creates a conflict with a stable, caller-actionable application error code.
   *
   * <p>For example, {@code new ConflictException("LOBBY_LIMIT_EXCEEDED", "Free allows one
   * lobby")} produces a {@code 409} response containing {@code code=LOBBY_LIMIT_EXCEEDED}.
   * Existing generic conflicts continue to use {@code common.conflict}.</p>
   *
   * @param errorCode stable code that clients can use to select a recovery action
   * @param message explanation suitable for the RFC 7807 response detail
   */
  public ConflictException(String errorCode, String message) {
    super(HttpStatus.CONFLICT, errorCode, message);
  }
}
