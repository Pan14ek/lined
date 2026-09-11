package io.backend.lined.auth.service;

import java.time.Duration;
import java.time.OffsetDateTime;

/** Raw token and expiry retained only across the in-memory delivery boundary. */
public record IssuedPasswordResetToken(String rawToken, OffsetDateTime expiresAt, Duration tokenTtl) {
}
