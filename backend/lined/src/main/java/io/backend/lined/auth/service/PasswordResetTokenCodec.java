package io.backend.lined.auth.service;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Component;

/** Generates URL-safe reset credentials and derives their non-reversible database hashes. */
@Component
public class PasswordResetTokenCodec {

  private static final String HMAC_ALGORITHM = "HmacSHA256";
  private static final int TOKEN_BYTES = 32;

  private final String secret;
  private final SecureRandom secureRandom = new SecureRandom();

  public PasswordResetTokenCodec(PasswordResetProperties properties) {
    this.secret = properties.getResetTokenSecret();
  }

  public String generate() {
    byte[] bytes = new byte[TOKEN_BYTES];
    secureRandom.nextBytes(bytes);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  }

  public String hash(String rawToken) {
    try {
      Mac mac = Mac.getInstance(HMAC_ALGORITHM);
      mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM));
      byte[] digest = mac.doFinal(rawToken.getBytes(StandardCharsets.UTF_8));
      return Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
    } catch (GeneralSecurityException ex) {
      throw new IllegalStateException("Unable to hash reset token", ex);
    }
  }
}
