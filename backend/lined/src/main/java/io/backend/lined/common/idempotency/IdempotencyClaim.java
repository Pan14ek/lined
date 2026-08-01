package io.backend.lined.common.idempotency;

/** Result of starting an optional idempotent operation. */
public record IdempotencyClaim(boolean replay, String idempotencyKey, Long resourceId) {

  public static IdempotencyClaim withoutKey() {
    return new IdempotencyClaim(false, null, null);
  }
}
