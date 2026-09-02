package io.backend.lined.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import io.backend.lined.auth.domain.AuthRefreshTokenEntity;
import io.backend.lined.auth.domain.AuthRefreshTokenRepository;
import io.backend.lined.auth.domain.AuthSessionEntity;
import io.backend.lined.auth.domain.AuthSessionRepository;
import io.backend.lined.common.exception.InvalidRefreshSessionException;
import io.backend.lined.user.domain.UserEntity;
import io.backend.lined.user.domain.UserRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
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
    verify(sessionRepository, times(2)).save(sessionCaptor.capture());
    verify(tokenRepository, times(2)).save(tokenCaptor.capture());
    assertThat(sessionCaptor.getAllValues()).extracting(AuthSessionEntity::getId)
        .containsExactly(first.sessionId(), second.sessionId());
    assertThat(tokenCaptor.getAllValues()).extracting(AuthRefreshTokenEntity::getTokenHash)
        .containsExactly("1".repeat(64), "2".repeat(64));
  }

  @Test
  void createSession_rejectsNonPositiveUserId() {
    assertThatIllegalArgumentException().isThrownBy(() -> service.createSession(0L));
  }

  @Test
  void createSession_redactsRawCredentialFromDiagnosticString() {
    assertThat(new IssuedRefreshSession(UUID.randomUUID(), "raw-token", utcNow()).toString())
        .doesNotContain("raw-token");
  }

  @Test
  void refresh_consumesCurrentTokenAndPersistsOneSuccessor() {
    UUID sessionId = UUID.randomUUID();
    UUID tokenId = UUID.randomUUID();
    AuthSessionEntity session = activeSession(sessionId);
    AuthRefreshTokenEntity current = token(tokenId, session, "old-hash");
    when(tokenHasher.hash("raw-refresh-token")).thenReturn("old-hash");
    when(tokenHasher.hash("new-refresh-token")).thenReturn("new-hash");
    when(tokenRepository.findByTokenHash("old-hash")).thenReturn(Optional.of(current));
    when(tokenRepository.consume("old-hash", utcNow())).thenReturn(1);
    when(tokenGenerator.generate()).thenReturn("new-refresh-token");

    RotatedRefreshSession rotated = service.refresh("raw-refresh-token");

    assertThat(rotated.userId()).isEqualTo(USER_ID);
    assertThat(rotated.refreshToken()).isEqualTo("new-refresh-token");
    assertThat(rotated.expiresAt()).isEqualTo(utcNow().plusDays(7));
    verify(tokenRepository).save(tokenCaptor.capture());
    AuthRefreshTokenEntity successor = tokenCaptor.getValue();
    assertThat(successor.getId()).isEqualTo(current.getReplacedByTokenId());
    assertThat(successor.getSession()).isSameAs(session);
    assertThat(successor.getTokenHash()).isEqualTo("new-hash");
    assertThat(current.getConsumedAt()).isEqualTo(utcNow());
    assertThat(session.getLastUsedAt()).isEqualTo(utcNow());
    assertThat(session.getIdleExpiresAt()).isEqualTo(utcNow().plusDays(7));
  }

  @Test
  void refresh_capsSuccessorIdleExpiryAtAbsoluteDeadline() {
    AuthSessionEntity session = activeSession(UUID.randomUUID());
    session.setAbsoluteExpiresAt(utcNow().plusDays(2));
    AuthRefreshTokenEntity current = token(UUID.randomUUID(), session, "old-hash");
    when(tokenHasher.hash("raw-refresh-token")).thenReturn("old-hash", "new-hash");
    when(tokenRepository.findByTokenHash("old-hash")).thenReturn(Optional.of(current));
    when(tokenRepository.consume("old-hash", utcNow())).thenReturn(1);
    when(tokenGenerator.generate()).thenReturn("new-refresh-token");

    RotatedRefreshSession rotated = service.refresh("raw-refresh-token");

    assertThat(rotated.expiresAt()).isEqualTo(session.getAbsoluteExpiresAt());
    assertThat(session.getIdleExpiresAt()).isEqualTo(session.getAbsoluteExpiresAt());
  }

  @Test
  void refresh_replayRevokesSessionFamilyAndReturnsGenericError() {
    UUID sessionId = UUID.randomUUID();
    AuthSessionEntity session = activeSession(sessionId);
    AuthRefreshTokenEntity current = token(UUID.randomUUID(), session, "old-hash");
    when(tokenHasher.hash("raw-refresh-token")).thenReturn("old-hash");
    when(tokenRepository.findByTokenHash("old-hash")).thenReturn(Optional.of(current));
    when(tokenRepository.consume("old-hash", utcNow())).thenReturn(0);

    assertThatThrownBy(() -> service.refresh("raw-refresh-token"))
        .isInstanceOf(InvalidRefreshSessionException.class)
        .hasMessage("Invalid refresh session.");

    verify(sessionRepository).revoke(sessionId, utcNow(), "refresh_reuse_detected");
    verify(tokenRepository).revokeActiveTokens(sessionId, utcNow());
    verify(tokenRepository).consume("old-hash", utcNow());
  }

  @Test
  void refresh_rejectsExpiredTokenWithoutRevokingFamily() {
    AuthSessionEntity session = activeSession(UUID.randomUUID());
    AuthRefreshTokenEntity current = token(UUID.randomUUID(), session, "old-hash");
    current.setExpiresAt(utcNow().minusSeconds(1));
    when(tokenHasher.hash("raw-refresh-token")).thenReturn("old-hash");
    when(tokenRepository.findByTokenHash("old-hash")).thenReturn(Optional.of(current));

    assertThatThrownBy(() -> service.refresh("raw-refresh-token"))
        .isInstanceOf(InvalidRefreshSessionException.class);

    verifyNoInteractions(tokenGenerator);
    verify(tokenRepository, never())
        .consume("old-hash", utcNow());
    verifyNoInteractions(sessionRepository);
  }

  @Test
  void refresh_reuseOfConsumedTokenRevokesTheRemainingFamily() {
    UUID sessionId = UUID.randomUUID();
    AuthSessionEntity session = activeSession(sessionId);
    AuthRefreshTokenEntity current = token(UUID.randomUUID(), session, "old-hash");
    current.setConsumedAt(utcNow().minusMinutes(1));
    when(tokenHasher.hash("raw-refresh-token")).thenReturn("old-hash");
    when(tokenRepository.findByTokenHash("old-hash")).thenReturn(Optional.of(current));

    assertThatThrownBy(() -> service.refresh("raw-refresh-token"))
        .isInstanceOf(InvalidRefreshSessionException.class);

    verify(sessionRepository).revoke(sessionId, utcNow(), "refresh_reuse_detected");
    verify(tokenRepository).revokeActiveTokens(sessionId, utcNow());
    verify(tokenRepository, never())
        .consume("old-hash", utcNow());
  }

  @Test
  void refresh_rejectsMissingOrUnknownTokenGenerically() {
    assertThatThrownBy(() -> service.refresh(" "))
        .isInstanceOf(InvalidRefreshSessionException.class);
    when(tokenHasher.hash("unknown-token")).thenReturn("unknown-hash");
    when(tokenRepository.findByTokenHash("unknown-hash")).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.refresh("unknown-token"))
        .isInstanceOf(InvalidRefreshSessionException.class);
  }

  @Test
  void logout_revokesOnlyTheOwningSessionAndItsActiveTokens() {
    UUID sessionId = UUID.randomUUID();
    AuthSessionEntity session = activeSession(sessionId);
    AuthRefreshTokenEntity current = token(UUID.randomUUID(), session, "refresh-hash");
    when(tokenHasher.hash("refresh-token")).thenReturn("refresh-hash");
    when(tokenRepository.findByTokenHash("refresh-hash")).thenReturn(Optional.of(current));

    service.logout("refresh-token");

    verify(sessionRepository).revoke(sessionId, utcNow(), "logout");
    verify(tokenRepository).revokeActiveTokens(sessionId, utcNow());
  }

  @Test
  void logout_isIdempotentForBlankAndUnknownCredentials() {
    service.logout(" ");

    when(tokenHasher.hash("unknown-token")).thenReturn("unknown-hash");
    when(tokenRepository.findByTokenHash("unknown-hash")).thenReturn(Optional.empty());
    service.logout("unknown-token");

    verifyNoInteractions(sessionRepository);
    verify(tokenRepository, never()).revokeActiveTokens(org.mockito.ArgumentMatchers.any(),
        org.mockito.ArgumentMatchers.any());
  }

  @Test
  void logout_revokesSessionWhenPresentedCredentialIsAlreadyConsumed() {
    UUID sessionId = UUID.randomUUID();
    AuthSessionEntity session = activeSession(sessionId);
    AuthRefreshTokenEntity consumed = token(UUID.randomUUID(), session, "consumed-hash");
    consumed.setConsumedAt(utcNow().minusMinutes(1));
    when(tokenHasher.hash("old-token")).thenReturn("consumed-hash");
    when(tokenRepository.findByTokenHash("consumed-hash")).thenReturn(Optional.of(consumed));

    service.logout("old-token");

    verify(sessionRepository).revoke(sessionId, utcNow(), "logout");
    verify(tokenRepository).revokeActiveTokens(sessionId, utcNow());
  }

  private AuthSessionEntity activeSession(UUID sessionId) {
    OffsetDateTime now = utcNow();
    UserEntity user = UserEntity.builder().id(USER_ID).build();
    return AuthSessionEntity.builder()
        .id(sessionId)
        .user(user)
        .createdAt(now.minusDays(1))
        .lastUsedAt(now.minusHours(1))
        .idleExpiresAt(now.plusDays(7))
        .absoluteExpiresAt(now.plusDays(30))
        .build();
  }

  private AuthRefreshTokenEntity token(UUID tokenId, AuthSessionEntity session, String hash) {
    return AuthRefreshTokenEntity.builder()
        .id(tokenId)
        .session(session)
        .tokenHash(hash)
        .issuedAt(utcNow().minusHours(1))
        .expiresAt(utcNow().plusDays(7))
        .build();
  }

  private OffsetDateTime utcNow() {
    return OffsetDateTime.ofInstant(NOW, ZoneOffset.UTC);
  }
}
