package io.backend.lined.auth.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.backend.lined.auth.service.AuthService;
import io.backend.lined.auth.service.AuthLoginResult;
import io.backend.lined.auth.service.PasswordResetService;
import java.time.OffsetDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

  @Mock
  private AuthService authService;
  @Mock
  private PasswordResetService passwordResetService;
  @Mock
  private RefreshTokenCookieWriter refreshTokenCookieWriter;
  @Mock
  private RefreshTokenCookieReader refreshTokenCookieReader;

  private AuthController controller;

  @BeforeEach
  void setUp() {
    controller = new AuthController(authService, passwordResetService, refreshTokenCookieWriter,
        refreshTokenCookieReader);
  }

  @Test
  void login_delegatesToAuthService() {
    var request = new AuthLoginDto("alice@example.com", null, null, "password");
    var response = new AuthLoginResponseDto("token", "Bearer", 900L);
    when(authService.login(request)).thenReturn(new AuthLoginResult(response, "refresh-token",
        OffsetDateTime.parse("2026-09-09T10:15:30Z")));

    AuthLoginResponseDto result = controller.login(request,
        new org.springframework.mock.web.MockHttpServletResponse());

    assertThat(result).isEqualTo(response);
    verify(authService).login(request);
    verify(refreshTokenCookieWriter).write(any(), org.mockito.ArgumentMatchers.eq("refresh-token"),
        org.mockito.ArgumentMatchers.any());
  }

  @Test
  void refresh_readsCookieAndDelegatesToAuthService() {
    var request = new org.springframework.mock.web.MockHttpServletRequest();
    var servletResponse = new org.springframework.mock.web.MockHttpServletResponse();
    var response = new AuthLoginResponseDto("token", "Bearer", 900L);
    var expiresAt = OffsetDateTime.parse("2026-09-09T10:15:30Z");
    when(refreshTokenCookieReader.read(request)).thenReturn(Optional.of("refresh-token"));
    when(authService.refresh("refresh-token")).thenReturn(
        new AuthLoginResult(response, "successor-token", expiresAt));

    AuthLoginResponseDto result = controller.refresh(request, servletResponse);

    assertThat(result).isEqualTo(response);
    verify(authService).refresh("refresh-token");
    verify(refreshTokenCookieWriter).write(any(), org.mockito.ArgumentMatchers.eq("successor-token"),
        org.mockito.ArgumentMatchers.eq(expiresAt));
  }

  @Test
  void logout_revokesCookieSessionAndExpiresCookie() {
    var request = new org.springframework.mock.web.MockHttpServletRequest();
    var servletResponse = new org.springframework.mock.web.MockHttpServletResponse();
    when(refreshTokenCookieReader.read(request)).thenReturn(Optional.of("refresh-token"));

    controller.logout(request, servletResponse);

    verify(authService).logout("refresh-token");
    verify(refreshTokenCookieWriter).clear(servletResponse);
  }

  @Test
  void requestPasswordReset_delegatesToPasswordResetService() {
    var request = new PasswordResetRequestDto("alice@example.com");

    controller.requestPasswordReset(request);

    verify(passwordResetService).requestReset(request);
  }

  @Test
  void resetPassword_delegatesToPasswordResetService() {
    var request = new PasswordResetDto("raw-token", "N3wP@ssword!");

    controller.resetPassword(request);

    verify(passwordResetService).reset(request);
  }
}
