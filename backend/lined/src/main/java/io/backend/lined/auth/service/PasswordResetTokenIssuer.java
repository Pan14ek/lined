package io.backend.lined.auth.service;

import io.backend.lined.auth.domain.PasswordResetTokenEntity;
import io.backend.lined.auth.domain.PasswordResetTokenRepository;
import io.backend.lined.user.domain.UserEntity;
import io.backend.lined.user.domain.UserRepository;
import jakarta.transaction.Transactional;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Persists a reset token in a short transaction before external delivery begins. */
@Service
@RequiredArgsConstructor
public class PasswordResetTokenIssuer {

  private final PasswordResetTokenRepository tokenRepository;
  private final UserRepository userRepository;
  private final PasswordResetProperties properties;
  private final PasswordResetTokenCodec codec;
  private final Clock clock;

  @Transactional
  public IssuedPasswordResetToken issue(UserEntity user) {
    String rawToken = codec.generate();
    OffsetDateTime now = OffsetDateTime.ofInstant(clock.instant(), ZoneOffset.UTC);
    OffsetDateTime expiresAt = now.plus(properties.getTokenTtl());
    tokenRepository.save(PasswordResetTokenEntity.builder()
        .user(userRepository.getReferenceById(user.getId()))
        .tokenHash(codec.hash(rawToken))
        .expiresAt(expiresAt)
        .build());
    return new IssuedPasswordResetToken(rawToken, expiresAt, properties.getTokenTtl());
  }
}
