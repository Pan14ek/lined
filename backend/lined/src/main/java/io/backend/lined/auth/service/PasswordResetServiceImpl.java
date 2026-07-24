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
import java.time.ZoneOffset;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * Implements signed-out recovery with opaque, HMAC-hashed, time-limited tokens.
 *
 * <p>For example, a request for {@code alex@example.com} creates a 32-byte Base64URL token,
 * persists only its HMAC-SHA256 hash, and logs the raw token as the temporary MVP delivery path.
 * A later redemption atomically claims that hash before changing the password: two simultaneous
 * submissions of one token yield one password change and one generic invalid-token response.
 * Unknown, expired, and already-used tokens intentionally share that response so the API does
 * not disclose token state.</p>
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

  /**
   * Creates the service with the repositories and cryptographic collaborators used by both steps.
   *
   * <p>For example, production injects the configured {@code PasswordEncoder} and reset-token
   * secret, while unit tests supply a fixed secret to assert that the same raw token maps to the
   * same stored hash.</p>
   *
   * @param userRepository resolves email or username identifiers
   * @param tokenRepository persists and atomically claims hashed reset tokens
   * @param passwordEncoder encodes a replacement password before it is stored
   * @param tokenSecret secret key used for HMAC-SHA256 token hashing
   */
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

  /**
   * Starts recovery for an identifier while keeping account existence private.
   *
   * <p>For example, {@code "alex@example.com"} is tried as an email first and then as a
   * username. If neither lookup succeeds, this method performs no write and returns normally, so
   * the controller still sends the same {@code 202 Accepted} response as it would for a known
   * user.</p>
   *
   * @param dto identifier supplied by the signed-out user
   */
  @Override
  public void requestReset(PasswordResetRequestDto dto) {
    String identifier = dto.identifier().trim();
    userRepository.findByEmailIgnoreCase(identifier)
        .or(() -> userRepository.findByUsernameIgnoreCase(identifier))
        .ifPresent(this::issueToken);
  }

  /**
   * Atomically consumes one valid token before changing the associated password.
   *
   * <p>For example, when two requests submit {@code raw-token} with different passwords, only
   * one conditional database update changes {@code usedAt} from {@code null}. Its transaction
   * encodes the winning password and invalidates sibling tokens; the loser receives the generic
   * {@code BadRequestException} without learning whether the token was used, expired, or unknown.</p>
   *
   * @param dto raw token and replacement password
   * @throws BadRequestException when the token cannot be claimed exactly once
   */
  @Override
  public void reset(PasswordResetDto dto) {
    String hash = hash(dto.token());
    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
    int claimed = tokenRepository.claimUnusedUnexpired(hash, now, now);
    if (claimed != 1) {
      throw new BadRequestException(INVALID_TOKEN_MESSAGE);
    }
    PasswordResetTokenEntity resetToken = tokenRepository.findByTokenHash(hash)
        .orElseThrow(() -> new BadRequestException(INVALID_TOKEN_MESSAGE));

    UserEntity user = resetToken.getUser();
    user.setPassword(passwordEncoder.encode(dto.newPassword()));
    resetToken.setUsedAt(now);
    invalidateOtherTokens(user.getId(), resetToken.getId(), now);
  }

  /**
   * Invalidates sibling tokens after one token successfully changes a user's password.
   *
   * <p>For example, redeeming token {@code A} marks a still-unused token {@code B} with the same
   * {@code usedAt} timestamp, so a delayed click on {@code B} cannot replace the new password.</p>
   *
   * @param userId owner of the tokens to invalidate
   * @param redeemedTokenId token that won the current redemption
   * @param now UTC timestamp recorded for invalidated tokens
   */
  private void invalidateOtherTokens(Long userId, Long redeemedTokenId, OffsetDateTime now) {
    tokenRepository.findAllByUser_IdAndUsedAtIsNull(userId).stream()
        .filter(token -> !token.getId().equals(redeemedTokenId))
        .forEach(token -> token.setUsedAt(now));
  }

  /**
   * Creates and persists a fresh reset token for a known user.
   *
   * <p>For example, the raw Base64URL token is delivered only through the temporary MVP log path,
   * while this method stores its HMAC hash and an expiry 30 minutes in the future. The database
   * never receives the raw token.</p>
   *
   * @param user account that requested password recovery
   */
  private void issueToken(UserEntity user) {
    String rawToken = generateRawToken();
    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
    PasswordResetTokenEntity token = PasswordResetTokenEntity.builder()
        .user(user)
        .tokenHash(hash(rawToken))
        .expiresAt(now.plusMinutes(TOKEN_TTL_MINUTES))
        .build();
    tokenRepository.save(token);
    log.info("Password reset requested for user {}: token={} "
        + "(dev/MVP delivery, no email/push channel yet)", user.getId(), rawToken);
  }

  /**
   * Generates a URL-safe random token with 256 bits of entropy.
   *
   * <p>For example, a 32-byte {@link SecureRandom} value becomes a Base64URL string without
   * padding, making it safe to include in a reset link or code without introducing a JWT session
   * credential.</p>
   *
   * @return newly generated raw token, intended only for out-of-band delivery
   */
  private String generateRawToken() {
    byte[] bytes = new byte[TOKEN_BYTES];
    secureRandom.nextBytes(bytes);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  }

  /**
   * Derives the deterministic database representation of a raw reset token.
   *
   * <p>For example, every submission of the same raw value and configured secret produces the
   * same Base64URL HMAC-SHA256 hash for lookup, but an attacker who reads that hash cannot use it
   * as the raw reset credential.</p>
   *
   * @param rawToken opaque token received from or delivered to a user
   * @return Base64URL-encoded HMAC-SHA256 hash
   * @throws IllegalStateException when the platform cannot initialize HMAC-SHA256
   */
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
