package io.backend.lined.auth.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.backend.lined.auth.service.AuthService;
import io.backend.lined.auth.service.PasswordResetService;
import io.backend.lined.common.exception.InvalidCredentialsException;
import io.backend.lined.config.GlobalExceptionHandler;
import io.backend.lined.featureflag.api.FeatureFlagBlockedRequestLogger;
import io.backend.lined.featureflag.api.FeatureRequiredResolver;
import io.backend.lined.featureflag.service.FeatureFlagService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(GlobalExceptionHandler.class)
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
        .thenReturn(new AuthLoginResponseDto("jwt", "Bearer", 900L));

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
        .andExpect(jsonPath("$.roles").doesNotExist());
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
}
