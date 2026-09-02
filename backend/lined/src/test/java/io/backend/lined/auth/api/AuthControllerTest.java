package io.backend.lined.auth.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.backend.lined.auth.service.AuthService;
import io.backend.lined.auth.service.AuthLoginResult;
import io.backend.lined.auth.service.PasswordResetService;
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

  private AuthController controller;

  @BeforeEach
  void setUp() {
    controller = new AuthController(authService, passwordResetService, refreshTokenCookieWriter);
  }

  @Test
  void login_delegatesToAuthService() {
    var request = new AuthLoginDto("alice@example.com", null, null, "password");
    var response = new AuthLoginResponseDto("token", "Bearer", 900L);
    when(authService.login(request)).thenReturn(new AuthLoginResult(response, "refresh-token"));

    AuthLoginResponseDto result = controller.login(request,
        new org.springframework.mock.web.MockHttpServletResponse());

    assertThat(result).isEqualTo(response);
    verify(authService).login(request);
    verify(refreshTokenCookieWriter).write(any(), org.mockito.ArgumentMatchers.eq("refresh-token"));
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
