package io.backend.lined.auth.service;

import java.time.OffsetDateTime;

/** Transient result of a successful refresh-token rotation. */
public record RotatedRefreshSession(
    long userId,
    String refreshToken,
    OffsetDateTime expiresAt
) {

  @Override
  public String toString() {
    return "RotatedRefreshSession[credentials redacted]";
  }
}
