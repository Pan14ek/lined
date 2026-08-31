package io.backend.lined.auth.service;

import java.time.Duration;
import java.util.Base64;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * External configuration for Lined access-token signing and validation.
 *
 * <p>The signing material is supplied only through {@code LINED_JWT_SECRET}. It is Base64-encoded
 * random key material rather than a human-readable password, so this type validates its decoded
 * length without ever logging the configured value.</p>
 *
 * @param issuer stable JWT issuer
 * @param audience intended resource-server audience
 * @param accessTokenTtl access-token lifetime
 * @param clockSkew maximum tolerated clock difference while validating timestamps
 * @param secret Base64-encoded HMAC key material
 */
@ConfigurationProperties("lined.security.jwt")
public record JwtProperties(
    String issuer,
    String audience,
    Duration accessTokenTtl,
    Duration clockSkew,
    String secret
) {

  private static final int MINIMUM_SECRET_BYTES = 32;

  /**
   * Validates externally supplied JWT configuration at application startup.
   *
   * <p>For example, a 16-byte development key is rejected before the application can issue or
   * accept a token, while a 32-byte Base64-encoded key supports HS256 safely.</p>
   */
  public JwtProperties {
    requireText(issuer, "JWT issuer is required");
    requireText(audience, "JWT audience is required");
    requirePositive(accessTokenTtl, "JWT access-token TTL must be positive");
    if (clockSkew == null || clockSkew.isNegative() || clockSkew.compareTo(accessTokenTtl) >= 0) {
      throw new IllegalArgumentException("JWT clock skew must be non-negative and less than TTL");
    }
    decodeSecret(secret);
  }

  /**
   * Builds the in-memory HS256 key used by both the JWT encoder and decoder.
   *
   * @return decoded signing key
   */
  public SecretKey signingKey() {
    return new SecretKeySpec(decodeSecret(secret), "HmacSHA256");
  }

  private static void requireText(String value, String message) {
    if (value == null || value.isBlank()) {
      throw new IllegalArgumentException(message);
    }
  }

  private static void requirePositive(Duration value, String message) {
    if (value == null || value.isZero() || value.isNegative()) {
      throw new IllegalArgumentException(message);
    }
  }

  private static byte[] decodeSecret(String value) {
    requireText(value, "JWT signing secret is required");
    try {
      byte[] decoded = Base64.getDecoder().decode(value);
      if (decoded.length < MINIMUM_SECRET_BYTES) {
        throw new IllegalArgumentException("JWT signing secret must decode to at least 32 bytes");
      }
      return decoded;
    } catch (IllegalArgumentException ex) {
      if (ex.getMessage() != null && ex.getMessage().startsWith("JWT signing secret")) {
        throw ex;
      }
      throw new IllegalArgumentException("JWT signing secret must be valid Base64", ex);
    }
  }

}
