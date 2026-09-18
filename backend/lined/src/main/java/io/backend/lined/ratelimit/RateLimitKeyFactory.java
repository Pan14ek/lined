package io.backend.lined.ratelimit;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.Base64;
import java.util.Locale;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Produces bounded non-plaintext keys for all attacker-controlled limiter dimensions. */
@Component
@RequiredArgsConstructor
public class RateLimitKeyFactory {

  private static final int MAX_IDENTIFIER_LENGTH = 255;
  private final RateLimitProperties properties;

  /** Hashes a canonical IP address into a non-plaintext bucket key.
   *
   * @param address canonical client address
   * @return keyed digest for the IP dimension
   */
  public String ipKey(String address) {
    return digest("ip:" + address);
  }

  /** Hashes a normalized identifier into a non-plaintext bucket key.
   *
   * @param identifier user-supplied identifier
   * @return keyed digest for the identifier dimension
   * @throws IllegalArgumentException when the identifier is invalid
   */
  public String identifierKey(String identifier) {
    String normalized = normalizeIdentifier(identifier);
    if (normalized == null) {
      throw new IllegalArgumentException("Identifier is invalid");
    }
    return digest("identifier:" + normalized);
  }

  /** Normalizes and bounds an attacker-controlled identifier.
   *
   * @param identifier user-supplied identifier
   * @return normalized identifier, or {@code null} when invalid
   */
  public String normalizeIdentifier(String identifier) {
    if (identifier == null) {
      return null;
    }
    String normalized = identifier.trim().toLowerCase(Locale.ROOT);
    return normalized.isEmpty() || normalized.length() > MAX_IDENTIFIER_LENGTH ? null : normalized;
  }

  private String digest(String value) {
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(properties.getKeySecret().getBytes(StandardCharsets.UTF_8),
          "HmacSHA256"));
      return Base64.getUrlEncoder().withoutPadding().encodeToString(
          mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
    } catch (GeneralSecurityException ex) {
      throw new IllegalStateException("Rate-limit key hashing is unavailable", ex);
    }
  }
}
