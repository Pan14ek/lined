package io.backend.lined.auth.service;

import java.security.SecureRandom;
import java.util.Base64;
import org.springframework.stereotype.Component;

/** Generates high-entropy opaque refresh credentials. */
@Component
public class RefreshTokenGenerator {

  private static final int TOKEN_BYTES = 32;

  private final SecureRandom secureRandom = new SecureRandom();

  /**
   * Generates a Base64URL credential with 256 bits of cryptographic entropy.
   *
   * @return new padding-free transport-safe opaque credential
   */
  public String generate() {
    byte[] bytes = new byte[TOKEN_BYTES];
    secureRandom.nextBytes(bytes);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  }
}
