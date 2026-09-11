package io.backend.lined.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.backend.lined.auth.domain.PasswordResetTokenEntity;
import io.backend.lined.auth.domain.PasswordResetTokenRepository;
import io.backend.lined.user.domain.UserEntity;
import io.backend.lined.user.domain.UserRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PasswordResetTokenIssuerTest {

  @Mock
  private PasswordResetTokenRepository tokenRepository;
  @Mock
  private UserRepository userRepository;
  @Mock
  private PasswordResetProperties properties;
  @Mock
  private PasswordResetTokenCodec codec;

  @Test
  void issuePersistsHashedTokenWithConfiguredExpiry() {
    UserEntity user = new UserEntity();
    user.setId(7L);
    Duration ttl = Duration.ofMinutes(30);
    Clock clock = Clock.fixed(Instant.parse("2026-09-09T10:15:30Z"), ZoneOffset.UTC);
    when(codec.generate()).thenReturn("raw-token");
    when(codec.hash("raw-token")).thenReturn("hashed-token");
    when(properties.getTokenTtl()).thenReturn(ttl);
    when(userRepository.getReferenceById(7L)).thenReturn(user);

    IssuedPasswordResetToken issued = new PasswordResetTokenIssuer(
        tokenRepository, userRepository, properties, codec, clock).issue(user);

    assertThat(issued.rawToken()).isEqualTo("raw-token");
    assertThat(issued.expiresAt()).isEqualTo(OffsetDateTime.parse("2026-09-09T10:45:30Z"));
    assertThat(issued.tokenTtl()).isEqualTo(ttl);
    ArgumentCaptor<PasswordResetTokenEntity> captor = ArgumentCaptor.forClass(
        PasswordResetTokenEntity.class);
    verify(tokenRepository).save(captor.capture());
    assertThat(captor.getValue().getUser()).isSameAs(user);
    assertThat(captor.getValue().getTokenHash()).isEqualTo("hashed-token");
    assertThat(captor.getValue().getExpiresAt()).isEqualTo(issued.expiresAt());
  }
}
