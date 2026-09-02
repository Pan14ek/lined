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
import io.backend.lined.auth.domain.PasswordResetTokenEntity;
import io.backend.lined.auth.domain.PasswordResetTokenRepository;
import io.backend.lined.common.exception.BadRequestException;
import io.backend.lined.user.domain.UserEntity;
import io.backend.lined.user.domain.UserRepository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class PasswordResetServiceImplTest {

  private static final String SECRET = "test-secret";
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

  private PasswordResetServiceImpl service;
  private UserEntity user;

  @BeforeEach
  void setUp() {
    service = new PasswordResetServiceImpl(userRepository, tokenRepository, passwordEncoder, SECRET);
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

    service.requestReset(dto);

    var captor = ArgumentCaptor.forClass(PasswordResetTokenEntity.class);
    verify(tokenRepository).save(captor.capture());
    var saved = captor.getValue();
    assertThat(saved.getUser()).isEqualTo(user);
    assertThat(saved.getTokenHash()).isNotBlank();
    assertThat(saved.getUsedAt()).isNull();
    assertThat(saved.getExpiresAt()).isAfter(OffsetDateTime.now());
  }

  @Test
  void requestReset_doesNotLogResetCredentials() {
    Logger logger = (Logger) LoggerFactory.getLogger(PasswordResetServiceImpl.class);
    ListAppender<ILoggingEvent> appender = new ListAppender<>();
    appender.start();
    logger.addAppender(appender);
    try {
      when(userRepository.findByEmailIgnoreCase(IDENTIFIER)).thenReturn(Optional.of(user));

      service.requestReset(new PasswordResetRequestDto(IDENTIFIER));
    } finally {
      logger.detachAppender(appender);
    }

    assertThat(appender.list)
        .noneMatch(event -> event.getFormattedMessage().contains("token="));
  }

  @Test
  void constructor_rejectsMissingTokenSecret() {
    assertThatThrownBy(() -> new PasswordResetServiceImpl(
        userRepository, tokenRepository, passwordEncoder, " "))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Password reset token secret is required");
  }

  @Test
  void requestReset_unknownIdentifier_isNoOpAndDoesNotThrow() {
    var dto = new PasswordResetRequestDto("missing@example.com");
    when(userRepository.findByEmailIgnoreCase("missing@example.com")).thenReturn(Optional.empty());
    when(userRepository.findByUsernameIgnoreCase("missing@example.com")).thenReturn(Optional.empty());

    assertThatCode(() -> service.requestReset(dto)).doesNotThrowAnyException();

    verify(tokenRepository, never()).save(any());
  }

  @Test
  void reset_validToken_updatesPasswordAndMarksTokenUsed() {
    var dto = new PasswordResetDto(RAW_TOKEN, NEW_PASSWORD);
    var tokenEntity = PasswordResetTokenEntity.builder()
        .id(1L)
        .user(user)
        .tokenHash("stored-hash")
        .expiresAt(OffsetDateTime.now().plusMinutes(10))
        .build();
    when(tokenRepository.claimUnusedUnexpired(anyString(), any(), any())).thenReturn(1);
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
    var redeemed = PasswordResetTokenEntity.builder()
        .id(1L).user(user).tokenHash("hash-1").expiresAt(OffsetDateTime.now().plusMinutes(10)).build();
    var other = PasswordResetTokenEntity.builder()
        .id(2L).user(user).tokenHash("hash-2").expiresAt(OffsetDateTime.now().plusMinutes(10)).build();
    when(tokenRepository.claimUnusedUnexpired(anyString(), any(), any())).thenReturn(1);
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

    assertThatThrownBy(() -> service.reset(dto))
        .isInstanceOf(BadRequestException.class)
        .hasMessageContaining("Invalid or expired reset token");
  }

  @Test
  void reset_alreadyUsedToken_throwsGenericBadRequest() {
    var dto = new PasswordResetDto(RAW_TOKEN, NEW_PASSWORD);
    when(tokenRepository.claimUnusedUnexpired(anyString(), any(), any())).thenReturn(0);

    assertThatThrownBy(() -> service.reset(dto)).isInstanceOf(BadRequestException.class);
  }
}
