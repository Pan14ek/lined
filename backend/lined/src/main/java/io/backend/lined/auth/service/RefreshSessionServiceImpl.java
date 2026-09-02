package io.backend.lined.auth.service;

import io.backend.lined.auth.domain.AuthRefreshTokenEntity;
import io.backend.lined.auth.domain.AuthRefreshTokenRepository;
import io.backend.lined.auth.domain.AuthSessionEntity;
import io.backend.lined.auth.domain.AuthSessionRepository;
import io.backend.lined.common.exception.InvalidRefreshSessionException;
import io.backend.lined.user.domain.UserRepository;
import jakarta.transaction.Transactional;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/** Creates persisted refresh-session state after successful credential authentication. */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(dontRollbackOn = InvalidRefreshSessionException.class)
public class RefreshSessionServiceImpl implements RefreshSessionService {

  private static final String REUSE_REASON = "refresh_reuse_detected";
  private static final String LOGOUT_REASON = "logout";

  private final Clock clock;
  private final RefreshSessionProperties properties;
  private final UserRepository userRepository;
  private final AuthSessionRepository sessionRepository;
  private final AuthRefreshTokenRepository tokenRepository;
  private final RefreshTokenGenerator tokenGenerator;
  private final RefreshTokenHasher tokenHasher;

  @Override
  public IssuedRefreshSession createSession(long userId) {
    if (userId <= 0) {
      throw new IllegalArgumentException("Session user id must be positive");
    }
    OffsetDateTime now = OffsetDateTime.ofInstant(clock.instant(), ZoneOffset.UTC);
    OffsetDateTime idleExpiresAt = now.plus(properties.refreshIdleTimeout());
    AuthSessionEntity session = AuthSessionEntity.builder()
        .id(UUID.randomUUID())
        .user(userRepository.getReferenceById(userId))
        .createdAt(now)
        .lastUsedAt(now)
        .idleExpiresAt(idleExpiresAt)
        .absoluteExpiresAt(now.plus(properties.absoluteTimeout()))
        .build();
    sessionRepository.save(session);

    String rawToken = tokenGenerator.generate();
    tokenRepository.save(AuthRefreshTokenEntity.builder()
        .id(UUID.randomUUID())
        .session(session)
        .tokenHash(tokenHasher.hash(rawToken))
        .issuedAt(now)
        .expiresAt(idleExpiresAt)
        .build());
    return new IssuedRefreshSession(session.getId(), rawToken, idleExpiresAt);
  }

  @Override
  public RotatedRefreshSession refresh(String rawToken) {
    if (rawToken == null || rawToken.isBlank()) {
      throw invalidSession();
    }
    OffsetDateTime now = currentTime();
    String tokenHash = tokenHasher.hash(rawToken);
    AuthRefreshTokenEntity current = tokenRepository.findByTokenHash(tokenHash)
        .orElseThrow(this::invalidSession);
    AuthSessionEntity session = current.getSession();
    UUID sessionId = session.getId();
    long userId = session.getUser().getId();
    if (!isUsable(current, session, now)) {
      if (isConsumedOrRevoked(current)) {
        revokeFamily(sessionId, now);
      }
      throw invalidSession();
    }
    if (tokenRepository.consume(tokenHash, now) != 1) {
      revokeFamily(sessionId, now);
      throw invalidSession();
    }

    OffsetDateTime successorExpiry = nextIdleExpiry(now, session.getAbsoluteExpiresAt());
    UUID successorId = UUID.randomUUID();
    String successor = tokenGenerator.generate();
    current.setConsumedAt(now);
    current.setReplacedByTokenId(successorId);
    tokenRepository.save(AuthRefreshTokenEntity.builder()
        .id(successorId)
        .session(session)
        .tokenHash(tokenHasher.hash(successor))
        .issuedAt(now)
        .expiresAt(successorExpiry)
        .build());
    session.setLastUsedAt(now);
    session.setIdleExpiresAt(successorExpiry);
    return new RotatedRefreshSession(userId, successor, successorExpiry);
  }

  @Override
  public void logout(String rawToken) {
    if (rawToken == null || rawToken.isBlank()) {
      return;
    }
    String tokenHash = tokenHasher.hash(rawToken);
    tokenRepository.findByTokenHash(tokenHash).ifPresent(token -> {
      UUID sessionId = token.getSession().getId();
      OffsetDateTime now = currentTime();
      sessionRepository.revoke(sessionId, now, LOGOUT_REASON);
      tokenRepository.revokeActiveTokens(sessionId, now);
    });
  }

  private OffsetDateTime currentTime() {
    return OffsetDateTime.ofInstant(clock.instant(), ZoneOffset.UTC);
  }

  private boolean isUsable(AuthRefreshTokenEntity token, AuthSessionEntity session,
                           OffsetDateTime now) {
    return !isConsumedOrRevoked(token)
        && session.getRevokedAt() == null
        && now.isBefore(token.getExpiresAt())
        && now.isBefore(session.getIdleExpiresAt())
        && now.isBefore(session.getAbsoluteExpiresAt());
  }

  private boolean isConsumedOrRevoked(AuthRefreshTokenEntity token) {
    return token.getConsumedAt() != null || token.getRevokedAt() != null;
  }

  private OffsetDateTime nextIdleExpiry(OffsetDateTime now, OffsetDateTime absoluteExpiry) {
    OffsetDateTime idleExpiry = now.plus(properties.refreshIdleTimeout());
    return idleExpiry.isBefore(absoluteExpiry) ? idleExpiry : absoluteExpiry;
  }

  private void revokeFamily(UUID sessionId, OffsetDateTime now) {
    sessionRepository.revoke(sessionId, now, REUSE_REASON);
    tokenRepository.revokeActiveTokens(sessionId, now);
    log.warn("auth.refresh.reuse_detected sessionId={}", sessionId);
  }

  private InvalidRefreshSessionException invalidSession() {
    return new InvalidRefreshSessionException();
  }
}
