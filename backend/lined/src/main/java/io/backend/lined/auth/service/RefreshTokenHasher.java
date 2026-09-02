package io.backend.lined.auth.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import org.springframework.stereotype.Component;

/** Derives the fixed-width database representation of an opaque refresh credential. */
@Component
public class RefreshTokenHasher {

  /**
   * Hashes a raw credential with SHA-256 for exact database lookup without persisting the secret.
   *
   * @param rawToken raw opaque credential held only during transport
   * @return lower-case 64-character SHA-256 hex value
   */
  public String hash(String rawToken) {
    if (rawToken == null || rawToken.isBlank()) {
      throw new IllegalArgumentException("Refresh token is required");
    }
    try {
      byte[] digest = MessageDigest.getInstance("SHA-256")
          .digest(rawToken.getBytes(StandardCharsets.UTF_8));
      return java.util.HexFormat.of().formatHex(digest);
    } catch (NoSuchAlgorithmException ex) {
      throw new IllegalStateException("SHA-256 is unavailable", ex);
    }
  }
}
