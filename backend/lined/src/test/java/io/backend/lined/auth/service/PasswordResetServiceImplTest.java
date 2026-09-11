package io.backend.lined.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.backend.lined.auth.api.PasswordResetDto;
import io.backend.lined.auth.api.PasswordResetRequestDto;
import io.backend.lined.auth.domain.AuthRefreshTokenRepository;
import io.backend.lined.auth.domain.AuthSessionRepository;
import io.backend.lined.auth.domain.PasswordResetTokenRepository;
import io.backend.lined.common.exception.BadRequestException;
import io.backend.lined.user.domain.UserEntity;
import io.backend.lined.user.domain.UserRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class PasswordResetServiceImplTest {

  private static final Long USER_ID = 7L;
  private static final String IDENTIFIER = "alice@example.com";
  private static final String RAW_TOKEN = "raw-token-value";
  private static final String NEW_PASSWORD = "N3wP@ssword!";
  private static final String ENCODED_PASSWORD = "encoded-new-password";

  @Mock
  private UserRepository userRepository;
  @Mock
  private PasswordResetTokenRepository tokenRepository;
  @Mock
  private PasswordEncoder passwordEncoder;
  @Mock
  private PasswordResetTokenIssuer tokenIssuer;
  @Mock
  private PasswordResetTokenCodec tokenCodec;
  @Mock
  private PasswordResetDelivery delivery;
  @Mock
  private PasswordResetUrlFactory urlFactory;
  @Mock
  private AuthSessionRepository sessionRepository;
  @Mock
  private AuthRefreshTokenRepository refreshTokenRepository;
  @Mock
  private PasswordResetMetrics metrics;

  private PasswordResetServiceImpl service;
  private UserEntity user;

  @org.junit.jupiter.api.BeforeEach
  void setUp() {
    service = new PasswordResetServiceImpl(
        userRepository, tokenRepository, passwordEncoder, tokenIssuer, tokenCodec, delivery,
        urlFactory, sessionRepository, refreshTokenRepository, metrics,
        Clock.fixed(Instant.parse("2026-09-09T10:15:30Z"), ZoneOffset.UTC));
    user = new UserEntity();
    user.setId(USER_ID);
    user.setUsername("alice");
    user.setEmail(IDENTIFIER);
    user.setPassword("old-encoded-password");
  }

  @Test
  void requestReset_knownIdentifier_persistsSingleUseExpiringToken() {
    var dto = new PasswordResetRequestDto(IDENTIFIER);
    when(userRepository.findByEmailIgnoreCase(IDENTIFIER)).thenReturn(Optional.of(user));
    var issued = new IssuedPasswordResetToken(RAW_TOKEN,
        OffsetDateTime.parse("2026-09-09T10:45:30Z"), Duration.ofMinutes(30));
    when(tokenIssuer.issue(user)).thenReturn(issued);
    when(urlFactory.create(RAW_TOKEN)).thenReturn("https://app.lined.test/reset-password?token=" + RAW_TOKEN);

    service.requestReset(dto);

    verify(tokenIssuer).issue(user);
    verify(delivery).deliver(any(PasswordResetDeliveryRequest.class));
    verify(metrics).deliverySucceeded();
  }

  @Test
  void requestReset_passesTypedDeliveryCommand() {
    when(userRepository.findByEmailIgnoreCase(IDENTIFIER)).thenReturn(Optional.of(user));
    OffsetDateTime expiresAt = OffsetDateTime.parse("2026-09-09T10:45:30Z");
    when(tokenIssuer.issue(user)).thenReturn(new IssuedPasswordResetToken(
        RAW_TOKEN, expiresAt, Duration.ofMinutes(30)));
    when(urlFactory.create(RAW_TOKEN)).thenReturn("https://app.lined.test/reset-password?token=" + RAW_TOKEN);

    service.requestReset(new PasswordResetRequestDto(IDENTIFIER));

    verify(delivery).deliver(new PasswordResetDeliveryRequest(
        IDENTIFIER, "https://app.lined.test/reset-password?token=" + RAW_TOKEN,
        expiresAt, Duration.ofMinutes(30)));
  }

  @Test
  void requestReset_unknownIdentifier_isNoOpAndDoesNotThrow() {
    var dto = new PasswordResetRequestDto("missing@example.com");
    when(userRepository.findByEmailIgnoreCase("missing@example.com")).thenReturn(Optional.empty());
    when(userRepository.findByUsernameIgnoreCase("missing@example.com")).thenReturn(Optional.empty());

    assertThatCode(() -> service.requestReset(dto)).doesNotThrowAnyException();

    verify(tokenIssuer, never()).issue(any());
  }

  @Test
  void reset_validToken_updatesPasswordAndMarksTokenUsed() {
    var dto = new PasswordResetDto(RAW_TOKEN, NEW_PASSWORD);
    var tokenEntity = io.backend.lined.auth.domain.PasswordResetTokenEntity.builder()
        .id(1L)
        .user(user)
        .tokenHash("stored-hash")
        .expiresAt(OffsetDateTime.now().plusMinutes(10))
        .build();
    when(tokenRepository.claimUnusedUnexpired(anyString(), any(), any())).thenReturn(1);
    when(tokenCodec.hash(RAW_TOKEN)).thenReturn("stored-hash");
    when(tokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(tokenEntity));
    when(passwordEncoder.encode(NEW_PASSWORD)).thenReturn(ENCODED_PASSWORD);
    when(tokenRepository.findAllByUser_IdAndUsedAtIsNull(USER_ID)).thenReturn(List.of(tokenEntity));

    service.reset(dto);

    assertThat(user.getPassword()).isEqualTo(ENCODED_PASSWORD);
    assertThat(tokenEntity.getUsedAt()).isNotNull();
  }

  @Test
  void reset_invalidatesOtherOutstandingTokensForSameUser() {
    var dto = new PasswordResetDto(RAW_TOKEN, NEW_PASSWORD);
    var redeemed = io.backend.lined.auth.domain.PasswordResetTokenEntity.builder()
        .id(1L).user(user).tokenHash("hash-1").expiresAt(OffsetDateTime.now().plusMinutes(10)).build();
    var other = io.backend.lined.auth.domain.PasswordResetTokenEntity.builder()
        .id(2L).user(user).tokenHash("hash-2").expiresAt(OffsetDateTime.now().plusMinutes(10)).build();
    when(tokenRepository.claimUnusedUnexpired(anyString(), any(), any())).thenReturn(1);
    when(tokenCodec.hash(RAW_TOKEN)).thenReturn("stored-hash");
    when(tokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(redeemed));
    when(passwordEncoder.encode(NEW_PASSWORD)).thenReturn(ENCODED_PASSWORD);
    when(tokenRepository.findAllByUser_IdAndUsedAtIsNull(USER_ID)).thenReturn(List.of(redeemed, other));

    service.reset(dto);

    assertThat(redeemed.getUsedAt()).isNotNull();
    assertThat(other.getUsedAt()).isNotNull();
  }

  @Test
  void reset_expiredToken_throwsGenericBadRequest() {
    var dto = new PasswordResetDto(RAW_TOKEN, NEW_PASSWORD);
    when(tokenRepository.claimUnusedUnexpired(anyString(), any(), any())).thenReturn(0);
    when(tokenCodec.hash(RAW_TOKEN)).thenReturn("stored-hash");

    assertThatThrownBy(() -> service.reset(dto))
        .isInstanceOf(BadRequestException.class)
        .hasMessageContaining("Invalid or expired reset token");

    verify(passwordEncoder, never()).encode(anyString());
    verify(tokenRepository, never()).findByTokenHash(anyString());
    verify(tokenRepository, never()).findAllByUser_IdAndUsedAtIsNull(USER_ID);
  }

  @Test
  void reset_unknownToken_throwsGenericBadRequest() {
    var dto = new PasswordResetDto(RAW_TOKEN, NEW_PASSWORD);
    when(tokenRepository.claimUnusedUnexpired(anyString(), any(), any())).thenReturn(0);
    when(tokenCodec.hash(RAW_TOKEN)).thenReturn("stored-hash");

    assertThatThrownBy(() -> service.reset(dto))
        .isInstanceOf(BadRequestException.class)
        .hasMessageContaining("Invalid or expired reset token");
  }

  @Test
  void reset_alreadyUsedToken_throwsGenericBadRequest() {
    var dto = new PasswordResetDto(RAW_TOKEN, NEW_PASSWORD);
    when(tokenRepository.claimUnusedUnexpired(anyString(), any(), any())).thenReturn(0);
    when(tokenCodec.hash(RAW_TOKEN)).thenReturn("stored-hash");

    assertThatThrownBy(() -> service.reset(dto)).isInstanceOf(BadRequestException.class);
  }

}
