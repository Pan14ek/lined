package io.backend.lined.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.backend.lined.auth.domain.AuthRefreshTokenEntity;
import io.backend.lined.auth.domain.AuthRefreshTokenRepository;
import io.backend.lined.auth.domain.AuthSessionEntity;
import io.backend.lined.auth.domain.AuthSessionRepository;
import io.backend.lined.user.domain.UserEntity;
import io.backend.lined.user.domain.UserRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RefreshSessionServiceImplTest {

  private static final long USER_ID = 42L;
  private static final Instant NOW = Instant.parse("2026-09-02T10:15:30Z");

  @Mock
  private UserRepository userRepository;
  @Mock
  private AuthSessionRepository sessionRepository;
  @Mock
  private AuthRefreshTokenRepository tokenRepository;
  @Mock
  private RefreshTokenGenerator tokenGenerator;
  @Mock
  private RefreshTokenHasher tokenHasher;
  @Captor
  private ArgumentCaptor<AuthSessionEntity> sessionCaptor;
  @Captor
  private ArgumentCaptor<AuthRefreshTokenEntity> tokenCaptor;

  private RefreshSessionServiceImpl service;

  @BeforeEach
  void setUp() {
    service = new RefreshSessionServiceImpl(Clock.fixed(NOW, ZoneOffset.UTC),
        new RefreshSessionProperties(Duration.ofDays(7), Duration.ofDays(30)), userRepository,
        sessionRepository, tokenRepository, tokenGenerator, tokenHasher);
  }

  @Test
  void createSession_persistsHashedTokenWithFixedClockDeadlines() {
    UserEntity user = UserEntity.builder().id(USER_ID).build();
    when(userRepository.getReferenceById(USER_ID)).thenReturn(user);
    when(tokenGenerator.generate()).thenReturn("raw-refresh-token");
    when(tokenHasher.hash("raw-refresh-token")).thenReturn("a".repeat(64));

    IssuedRefreshSession issued = service.createSession(USER_ID);

    OffsetDateTime now = OffsetDateTime.ofInstant(NOW, ZoneOffset.UTC);
    verify(sessionRepository).save(sessionCaptor.capture());
    verify(tokenRepository).save(tokenCaptor.capture());
    AuthSessionEntity session = sessionCaptor.getValue();
    AuthRefreshTokenEntity token = tokenCaptor.getValue();
    assertThat(session.getId()).isEqualTo(issued.sessionId());
    assertThat(session.getUser()).isSameAs(user);
    assertThat(session.getCreatedAt()).isEqualTo(now);
    assertThat(session.getLastUsedAt()).isEqualTo(now);
    assertThat(session.getIdleExpiresAt()).isEqualTo(now.plusDays(7));
    assertThat(session.getAbsoluteExpiresAt()).isEqualTo(now.plusDays(30));
    assertThat(token.getSession()).isSameAs(session);
    assertThat(token.getTokenHash()).isEqualTo("a".repeat(64));
    assertThat(token.getTokenHash()).isNotEqualTo(issued.refreshToken());
    assertThat(token.getIssuedAt()).isEqualTo(now);
    assertThat(token.getExpiresAt()).isEqualTo(now.plusDays(7));
    assertThat(issued.expiresAt()).isEqualTo(now.plusDays(7));
  }

  @Test
  void createSession_createsIndependentRecordsForRepeatedLogins() {
    UserEntity user = UserEntity.builder().id(USER_ID).build();
    when(userRepository.getReferenceById(USER_ID)).thenReturn(user);
    when(tokenGenerator.generate()).thenReturn("first-token", "second-token");
    when(tokenHasher.hash("first-token")).thenReturn("1".repeat(64));
    when(tokenHasher.hash("second-token")).thenReturn("2".repeat(64));

    IssuedRefreshSession first = service.createSession(USER_ID);
    IssuedRefreshSession second = service.createSession(USER_ID);

    assertThat(second.sessionId()).isNotEqualTo(first.sessionId());
    assertThat(second.refreshToken()).isNotEqualTo(first.refreshToken());
    verify(sessionRepository, org.mockito.Mockito.times(2)).save(sessionCaptor.capture());
    verify(tokenRepository, org.mockito.Mockito.times(2)).save(tokenCaptor.capture());
    assertThat(sessionCaptor.getAllValues()).extracting(AuthSessionEntity::getId)
        .containsExactly(first.sessionId(), second.sessionId());
    assertThat(tokenCaptor.getAllValues()).extracting(AuthRefreshTokenEntity::getTokenHash)
        .containsExactly("1".repeat(64), "2".repeat(64));
  }

  @Test
  void createSession_rejectsNonPositiveUserId() {
    assertThatIllegalArgumentException().isThrownBy(() -> service.createSession(0L));
  }
}
