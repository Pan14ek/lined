package io.backend.lined.auth.service;

import io.backend.lined.auth.api.PasswordResetDto;
import io.backend.lined.auth.api.PasswordResetRequestDto;
import io.backend.lined.auth.domain.AuthRefreshTokenRepository;
import io.backend.lined.auth.domain.AuthSessionRepository;
import io.backend.lined.auth.domain.PasswordResetTokenEntity;
import io.backend.lined.auth.domain.PasswordResetTokenRepository;
import io.backend.lined.common.exception.BadRequestException;
import io.backend.lined.user.domain.UserEntity;
import io.backend.lined.user.domain.UserRepository;
import jakarta.transaction.Transactional;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * Implements signed-out recovery with opaque, HMAC-hashed, time-limited tokens.
 *
 * <p>For example, a request for {@code alex@example.com} creates a 32-byte Base64URL token and
 * persists only its HMAC-SHA256 hash. The raw token is never logged. A later redemption atomically
 * claims that hash before changing the password: two simultaneous submissions of one token yield
 * one password change and one generic invalid-token response.
 * Unknown, expired, and already-used tokens intentionally share that response so the API does
 * not disclose token state.</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PasswordResetServiceImpl implements PasswordResetService {

  private static final String INVALID_TOKEN_MESSAGE = "Invalid or expired reset token";

  private final UserRepository userRepository;
  private final PasswordResetTokenRepository tokenRepository;
  private final PasswordEncoder passwordEncoder;
  private final PasswordResetTokenIssuer tokenIssuer;
  private final PasswordResetTokenCodec tokenCodec;
  private final PasswordResetDelivery delivery;
  private final PasswordResetUrlFactory urlFactory;
  private final AuthSessionRepository sessionRepository;
  private final AuthRefreshTokenRepository refreshTokenRepository;
  private final PasswordResetMetrics metrics;
  private final Clock clock;

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
    metrics.requestAccepted();
    String identifier = dto.identifier().trim();
    userRepository.findByEmailIgnoreCase(identifier)
        .or(() -> userRepository.findByUsernameIgnoreCase(identifier))
        .ifPresent(this::issueAndDeliver);
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
  @Transactional
  public void reset(PasswordResetDto dto) {
    String hash = tokenCodec.hash(dto.token());
    OffsetDateTime now = OffsetDateTime.ofInstant(clock.instant(), ZoneOffset.UTC);
    int claimed = tokenRepository.claimUnusedUnexpired(hash, now, now);
    if (claimed != 1) {
      metrics.redemptionFailed();
      throw new BadRequestException(INVALID_TOKEN_MESSAGE);
    }
    PasswordResetTokenEntity resetToken = tokenRepository.findByTokenHash(hash)
        .orElseThrow(() -> new BadRequestException(INVALID_TOKEN_MESSAGE));

    UserEntity user = resetToken.getUser();
    user.setPassword(passwordEncoder.encode(dto.newPassword()));
    resetToken.setUsedAt(now);
    invalidateOtherTokens(user.getId(), resetToken.getId(), now);
    sessionRepository.revokeAllForUser(user.getId(), now, "password_reset");
    refreshTokenRepository.revokeActiveTokensForUser(user.getId(), now);
    metrics.redemptionSucceeded();
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
   * <p>For example, this method stores the HMAC hash and an expiry 30 minutes in the future. The
   * database and application logs never receive the raw token; delivery remains an out-of-band
   * integration concern.</p>
   *
   * @param user account that requested password recovery
   */
  private void issueAndDeliver(UserEntity user) {
    IssuedPasswordResetToken issued = tokenIssuer.issue(user);
    PasswordResetDeliveryRequest request = new PasswordResetDeliveryRequest(
        user.getEmail(), urlFactory.create(issued.rawToken()), issued.expiresAt(),
        issued.tokenTtl());
    try {
      delivery.deliver(request);
      metrics.deliverySucceeded();
    } catch (PasswordResetDeliveryException ex) {
      metrics.deliveryFailed();
      log.warn("auth.password_reset.delivery_failed reason={}", ex.getClass().getSimpleName());
    }
  }
}
