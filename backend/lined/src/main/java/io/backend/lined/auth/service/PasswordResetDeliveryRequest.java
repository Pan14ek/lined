package io.backend.lined.auth.service;

import java.net.URI;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Objects;

/** Typed command crossing the password-reset domain and outbound delivery boundary. */
public record PasswordResetDeliveryRequest(
    String recipient,
    String resetUrl,
    OffsetDateTime expiresAt,
    Duration tokenTtl) {

  public PasswordResetDeliveryRequest {
    requireHeaderSafe(recipient, "recipient");
    URI uri = resetUrl == null ? null : URI.create(resetUrl);
    boolean trustedScheme = uri != null && ("http".equalsIgnoreCase(uri.getScheme())
        || "https".equalsIgnoreCase(uri.getScheme()));
    if (uri == null || !uri.isAbsolute() || uri.getHost() == null || !trustedScheme) {
      throw new IllegalArgumentException("resetUrl must be an absolute URI");
    }
    Objects.requireNonNull(expiresAt, "expiresAt");
    Objects.requireNonNull(tokenTtl, "tokenTtl");
    if (tokenTtl.isZero() || tokenTtl.isNegative()) {
      throw new IllegalArgumentException("tokenTtl must be positive");
    }
  }

  private static void requireHeaderSafe(String value, String field) {
    if (value == null || value.isBlank() || value.indexOf('\r') >= 0 || value.indexOf('\n') >= 0) {
      throw new IllegalArgumentException(field + " must be non-blank and header-safe");
    }
  }
}
