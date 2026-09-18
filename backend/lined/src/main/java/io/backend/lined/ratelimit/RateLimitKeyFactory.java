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

  public String ipKey(String address) {
    return digest("ip:" + address);
  }

  public String identifierKey(String identifier) {
    String normalized = normalizeIdentifier(identifier);
    if (normalized == null) {
      throw new IllegalArgumentException("Identifier is invalid");
    }
    return digest("identifier:" + normalized);
  }

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
