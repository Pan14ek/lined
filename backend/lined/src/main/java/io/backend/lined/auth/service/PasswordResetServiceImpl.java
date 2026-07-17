package io.backend.lined.auth.service;

import io.backend.lined.auth.api.PasswordResetDto;
import io.backend.lined.auth.api.PasswordResetRequestDto;
import io.backend.lined.auth.domain.PasswordResetTokenEntity;
import io.backend.lined.auth.domain.PasswordResetTokenRepository;
import io.backend.lined.common.exception.BadRequestException;
import io.backend.lined.user.domain.UserEntity;
import io.backend.lined.user.domain.UserRepository;
import jakarta.transaction.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * Token lifecycle: request generates a single-use, HMAC-hashed token and logs
 * the raw value server-side (MVP stand-in until real email/push delivery
 * exists); redemption collapses "unknown", "expired", and "already used"
 * into one generic 400 so the response never reveals which case applied.
 */
@Slf4j
@Service
@Transactional
public class PasswordResetServiceImpl implements PasswordResetService {

  private static final String INVALID_TOKEN_MESSAGE = "Invalid or expired reset token";
  private static final String HMAC_ALGORITHM = "HmacSHA256";
  private static final long TOKEN_TTL_MINUTES = 30;
  private static final int TOKEN_BYTES = 32;

  private final UserRepository userRepository;
  private final PasswordResetTokenRepository tokenRepository;
  private final PasswordEncoder passwordEncoder;
  private final String tokenSecret;
  private final SecureRandom secureRandom = new SecureRandom();

  public PasswordResetServiceImpl(
      UserRepository userRepository,
      PasswordResetTokenRepository tokenRepository,
      PasswordEncoder passwordEncoder,
      @Value("${lined.auth.reset-token-secret:local-development-only-change-me}")
      String tokenSecret) {
    this.userRepository = userRepository;
    this.tokenRepository = tokenRepository;
    this.passwordEncoder = passwordEncoder;
    this.tokenSecret = tokenSecret;
  }

  @Override
  public void requestReset(PasswordResetRequestDto dto) {
    String identifier = dto.identifier().trim();
    userRepository.findByEmailIgnoreCase(identifier)
        .or(() -> userRepository.findByUsernameIgnoreCase(identifier))
        .ifPresent(this::issueToken);
  }

  @Override
  public void reset(PasswordResetDto dto) {
    String hash = hash(dto.token());
    OffsetDateTime now = OffsetDateTime.now();
    PasswordResetTokenEntity resetToken = tokenRepository.findByTokenHashAndUsedAtIsNull(hash)
        .filter(token -> token.getExpiresAt().isAfter(now))
        .orElseThrow(() -> new BadRequestException(INVALID_TOKEN_MESSAGE));

    UserEntity user = resetToken.getUser();
    user.setPassword(passwordEncoder.encode(dto.newPassword()));
    resetToken.setUsedAt(now);
    invalidateOtherTokens(user.getId(), resetToken.getId(), now);
  }

  private void invalidateOtherTokens(Long userId, Long redeemedTokenId, OffsetDateTime now) {
    tokenRepository.findAllByUser_IdAndUsedAtIsNull(userId).stream()
        .filter(token -> !token.getId().equals(redeemedTokenId))
        .forEach(token -> token.setUsedAt(now));
  }

  private void issueToken(UserEntity user) {
    String rawToken = generateRawToken();
    OffsetDateTime now = OffsetDateTime.now();
    PasswordResetTokenEntity token = PasswordResetTokenEntity.builder()
        .user(user)
        .tokenHash(hash(rawToken))
        .expiresAt(now.plusMinutes(TOKEN_TTL_MINUTES))
        .build();
    tokenRepository.save(token);
    log.info("Password reset requested for user {}: token={} "
        + "(dev/MVP delivery, no email/push channel yet)", user.getId(), rawToken);
  }

  private String generateRawToken() {
    byte[] bytes = new byte[TOKEN_BYTES];
    secureRandom.nextBytes(bytes);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  }

  private String hash(String rawToken) {
    try {
      Mac mac = Mac.getInstance(HMAC_ALGORITHM);
      mac.init(new SecretKeySpec(tokenSecret.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM));
      byte[] digest = mac.doFinal(rawToken.getBytes(StandardCharsets.UTF_8));
      return Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
    } catch (GeneralSecurityException ex) {
      throw new IllegalStateException("Unable to hash reset token", ex);
    }
  }
}
