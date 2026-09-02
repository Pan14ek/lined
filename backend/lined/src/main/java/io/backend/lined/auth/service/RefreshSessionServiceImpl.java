package io.backend.lined.auth.service;

import io.backend.lined.auth.domain.AuthRefreshTokenEntity;
import io.backend.lined.auth.domain.AuthRefreshTokenRepository;
import io.backend.lined.auth.domain.AuthSessionEntity;
import io.backend.lined.auth.domain.AuthSessionRepository;
import io.backend.lined.user.domain.UserRepository;
import jakarta.transaction.Transactional;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Creates persisted refresh-session state after successful credential authentication. */
@Service
@RequiredArgsConstructor
@Transactional
public class RefreshSessionServiceImpl implements RefreshSessionService {

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
}
