package io.backend.lined.auth.service;

import io.backend.lined.user.domain.UserEntity;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AuthTokenService {

  private static final String TOKEN_TYPE = "Bearer";
  private static final String ALGORITHM = "HmacSHA256";
  private static final String VERSION = "v1";

  private final String secret;
  private final long ttlSeconds;

  public AuthTokenService(
      @Value("${lined.auth.token-secret:local-development-only-change-me}") String secret,
      @Value("${lined.auth.token-ttl-seconds:3600}") long ttlSeconds) {
    this.secret = secret;
    this.ttlSeconds = ttlSeconds;
  }

  public String issueFor(UserEntity user) {
    long expiresAt = Instant.now().plusSeconds(ttlSeconds).getEpochSecond();
    String payload = "%s:%d:%d".formatted(VERSION, user.getId(), expiresAt);
    return encode(payload) + "." + sign(payload);
  }

  public String tokenType() {
    return TOKEN_TYPE;
  }

  public long ttlSeconds() {
    return ttlSeconds;
  }

  private String sign(String payload) {
    try {
      Mac mac = Mac.getInstance(ALGORITHM);
      mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), ALGORITHM));
      byte[] signature = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
      return Base64.getUrlEncoder().withoutPadding().encodeToString(signature);
    } catch (java.security.GeneralSecurityException ex) {
      throw new IllegalStateException("Unable to issue auth token", ex);
    }
  }

  private String encode(String payload) {
    return Base64.getUrlEncoder().withoutPadding()
        .encodeToString(payload.getBytes(StandardCharsets.UTF_8));
  }
}
