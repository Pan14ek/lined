package io.backend.lined.auth.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.hamcrest.Matchers.allOf;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.backend.lined.auth.service.RefreshCookieProperties;
import io.backend.lined.auth.service.RefreshSessionProperties;
import io.backend.lined.auth.service.AuthLoginResult;
import io.backend.lined.auth.service.AuthService;
import io.backend.lined.auth.service.PasswordResetService;
import io.backend.lined.common.exception.InvalidCredentialsException;
import io.backend.lined.config.GlobalExceptionHandler;
import io.backend.lined.featureflag.api.FeatureFlagBlockedRequestLogger;
import io.backend.lined.featureflag.api.FeatureRequiredResolver;
import io.backend.lined.featureflag.service.FeatureFlagService;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import({GlobalExceptionHandler.class, RefreshTokenCookieWriter.class,
    AuthControllerMvcTest.RefreshCookieTestConfiguration.class})
class AuthControllerMvcTest {

  @Autowired
  private MockMvc mockMvc;

  @MockitoBean
  private AuthService authService;
  @MockitoBean
  private PasswordResetService passwordResetService;
  @MockitoBean
  private RefreshTokenCookieReader refreshTokenCookieReader;
  @MockitoBean
  private FeatureFlagService featureFlagService;
  @MockitoBean
  private FeatureRequiredResolver featureRequiredResolver;
  @MockitoBean
  private FeatureFlagBlockedRequestLogger featureFlagBlockedRequestLogger;

  @Test
  void login_returnsOnlyApprovedTokenFields() throws Exception {
    when(authService.login(any(AuthLoginDto.class)))
        .thenReturn(new AuthLoginResult(
            new AuthLoginResponseDto("jwt", "Bearer", 900L), "refresh-token",
            Instant.parse("2026-09-09T10:15:30Z").atOffset(ZoneOffset.UTC)));

    mockMvc.perform(post("/api/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"identifier\":\"alice@example.com\",\"password\":\"password\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.accessToken").value("jwt"))
        .andExpect(jsonPath("$.tokenType").value("Bearer"))
        .andExpect(jsonPath("$.expiresIn").value(900))
        .andExpect(jsonPath("$.userId").doesNotExist())
        .andExpect(jsonPath("$.username").doesNotExist())
        .andExpect(jsonPath("$.email").doesNotExist())
        .andExpect(jsonPath("$.roles").doesNotExist())
        .andExpect(header().string(HttpHeaders.SET_COOKIE, allOf(
            containsString("lined_refresh=refresh-token"),
            containsString("Path=/api/auth"),
            containsString("Max-Age=604800"),
            containsString("Secure"),
            containsString("HttpOnly"),
            containsString("SameSite=Lax"))));
  }

  @Test
  void refresh_returnsNewTokenAndRotatedCookie() throws Exception {
    when(refreshTokenCookieReader.read(any())).thenReturn(Optional.of("refresh-token"));
    when(authService.refresh("refresh-token")).thenReturn(new AuthLoginResult(
        new AuthLoginResponseDto("new-jwt", "Bearer", 900L), "successor-token",
        Instant.parse("2026-09-09T10:15:30Z").atOffset(ZoneOffset.UTC)));

    mockMvc.perform(post("/api/auth/refresh").with(
            org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.accessToken").value("new-jwt"))
        .andExpect(header().string(HttpHeaders.SET_COOKIE, allOf(
            containsString("lined_refresh=successor-token"),
            containsString("Max-Age=604800"),
            containsString("HttpOnly"),
            containsString("SameSite=Lax"))));
  }

  @Test
  void logout_returnsNoContentAndExpiredCookie() throws Exception {
    when(refreshTokenCookieReader.read(any())).thenReturn(Optional.of("refresh-token"));

    mockMvc.perform(post("/api/auth/logout").with(
            org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf()))
        .andExpect(status().isNoContent())
        .andExpect(content().string(""))
        .andExpect(header().string(HttpHeaders.SET_COOKIE, allOf(
            containsString("lined_refresh="),
            containsString("Max-Age=0"),
            containsString("Path=/api/auth"),
            containsString("Secure"),
            containsString("HttpOnly"),
            containsString("SameSite=Lax"))));
  }

  @Test
  void refresh_returnsGenericProblemWhenSessionIsInvalid() throws Exception {
    when(refreshTokenCookieReader.read(any())).thenReturn(Optional.of("refresh-token"));
    when(authService.refresh("refresh-token"))
        .thenThrow(new io.backend.lined.common.exception.InvalidRefreshSessionException());

    mockMvc.perform(post("/api/auth/refresh").with(
            org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf()))
        .andExpect(status().isUnauthorized())
        .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
        .andExpect(jsonPath("$.detail").value("Invalid refresh session."))
        .andExpect(jsonPath("$.code").value("auth.session.invalid"));
  }

  @Test
  void refresh_returnsGenericProblemWhenCookieIsMissing() throws Exception {
    when(refreshTokenCookieReader.read(any())).thenReturn(Optional.empty());
    when(authService.refresh(null))
        .thenThrow(new io.backend.lined.common.exception.InvalidRefreshSessionException());

    mockMvc.perform(post("/api/auth/refresh").with(
            org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf()))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("auth.session.invalid"));
  }

  @Test
  void login_returnsSameCredentialProblemForUnknownIdentifierAndBadPassword() throws Exception {
    when(authService.login(any(AuthLoginDto.class))).thenThrow(new InvalidCredentialsException());

    assertInvalidCredentials("{\"identifier\":\"unknown@example.com\",\"password\":\"password\"}");
    assertInvalidCredentials("{\"identifier\":\"alice@example.com\",\"password\":\"wrong\"}");
  }

  private void assertInvalidCredentials(String content) throws Exception {
    mockMvc.perform(post("/api/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(content))
        .andExpect(status().isUnauthorized())
        .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
        .andExpect(jsonPath("$.title").value("Invalid credentials"))
        .andExpect(jsonPath("$.detail").value("Invalid email, username, or password."))
        .andExpect(jsonPath("$.code").value("auth.credentials.invalid"));
  }

  @TestConfiguration
  static class RefreshCookieTestConfiguration {

    @Bean
    RefreshCookieProperties refreshCookieProperties() {
      return new RefreshCookieProperties("lined_refresh", true, "Lax", "/api/auth", false);
    }

    @Bean
    @Primary
    Clock testClock() {
      return Clock.fixed(Instant.parse("2026-09-02T10:15:30Z"), ZoneOffset.UTC);
    }

    @Bean
    RefreshSessionProperties refreshSessionProperties() {
      return new RefreshSessionProperties(Duration.ofDays(7), Duration.ofDays(30));
    }
  }
}
