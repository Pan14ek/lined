package io.backend.lined.auth.service;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Transient result of creating a persisted refresh session at successful login. */
public record IssuedRefreshSession(
    UUID sessionId,
    String refreshToken,
    OffsetDateTime expiresAt
) {
}
