package io.backend.lined.auth.api;

import io.backend.lined.auth.service.AuthService;
import io.backend.lined.auth.service.AuthLoginResult;
import io.backend.lined.auth.service.PasswordResetService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

  private final AuthService authService;
  private final PasswordResetService passwordResetService;
  private final RefreshTokenCookieWriter refreshTokenCookieWriter;

  @PostMapping("/login")
  public AuthLoginResponseDto login(
      @Valid @RequestBody AuthLoginDto dto, HttpServletResponse response) {
    AuthLoginResult result = authService.login(dto);
    refreshTokenCookieWriter.write(response, result.refreshToken());
    return result.response();
  }

  @PostMapping("/password-reset-requests")
  @ResponseStatus(HttpStatus.ACCEPTED)
  public void requestPasswordReset(@Valid @RequestBody PasswordResetRequestDto dto) {
    passwordResetService.requestReset(dto);
  }

  @PostMapping("/password-resets")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void resetPassword(@Valid @RequestBody PasswordResetDto dto) {
    passwordResetService.reset(dto);
  }
}
