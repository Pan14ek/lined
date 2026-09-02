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
import io.backend.lined.auth.service.AuthService;
import io.backend.lined.auth.service.AuthLoginResult;
import io.backend.lined.auth.service.PasswordResetService;
import io.backend.lined.common.exception.InvalidCredentialsException;
import io.backend.lined.config.GlobalExceptionHandler;
import io.backend.lined.featureflag.api.FeatureFlagBlockedRequestLogger;
import io.backend.lined.featureflag.api.FeatureRequiredResolver;
import io.backend.lined.featureflag.service.FeatureFlagService;
import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
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
  private FeatureFlagService featureFlagService;
  @MockitoBean
  private FeatureRequiredResolver featureRequiredResolver;
  @MockitoBean
  private FeatureFlagBlockedRequestLogger featureFlagBlockedRequestLogger;

  @Test
  void login_returnsOnlyApprovedTokenFields() throws Exception {
    when(authService.login(any(AuthLoginDto.class)))
        .thenReturn(new AuthLoginResult(
            new AuthLoginResponseDto("jwt", "Bearer", 900L), "refresh-token"));

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
      return new RefreshCookieProperties("lined_refresh", true, "Lax", "/api/auth");
    }

    @Bean
    RefreshSessionProperties refreshSessionProperties() {
      return new RefreshSessionProperties(Duration.ofDays(7), Duration.ofDays(30));
    }
  }
}
