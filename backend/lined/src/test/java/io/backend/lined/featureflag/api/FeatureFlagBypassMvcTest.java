package io.backend.lined.featureflag.api;

import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.backend.lined.config.GlobalExceptionHandler;
import io.backend.lined.config.ProblemAccessDeniedHandler;
import io.backend.lined.config.ProblemAuthenticationEntryPoint;
import io.backend.lined.config.SecurityConfig;
import io.backend.lined.config.SecurityProblemDetailsWriter;
import io.backend.lined.featureflag.domain.FeatureFlagKey;
import io.backend.lined.featureflag.service.FeatureFlagService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@WebMvcTest(controllers = FeatureFlagBypassMvcTest.BypassController.class)
@Import({FeatureFlagWebMvcConfiguration.class, FeatureFlagInterceptor.class,
    FeatureRequiredResolver.class, FeatureFlagBlockedRequestLogger.class, GlobalExceptionHandler.class,
    SecurityConfig.class, SecurityProblemDetailsWriter.class, ProblemAuthenticationEntryPoint.class,
    ProblemAccessDeniedHandler.class,
    FeatureFlagBypassMvcTest.BypassController.class})
class FeatureFlagBypassMvcTest {

  private static final String AUTH_CHECK_PATH = "/api/auth/check";
  private static final String FEATURES_PATH = "/api/features";
  private static final String ADMIN_CHECK_PATH = "/api/admin/feature-flags/check";
  private static final String ACTUATOR_CHECK_PATH = "/actuator/check";
  private static final String OPEN_RESPONSE = "open";

  @Autowired
  private MockMvc mockMvc;

  @MockitoBean
  private FeatureFlagService featureFlagService;
  @MockitoBean
  private UserDetailsService userDetailsService;

  @Test
  void controlPlaneAndActuatorRoutes_bypassFeatureEnforcement() throws Exception {
    mockMvc.perform(get(AUTH_CHECK_PATH).with(user("operator"))).andExpect(status().isOk());
    mockMvc.perform(get(FEATURES_PATH)).andExpect(status().isOk());
    mockMvc.perform(get(ADMIN_CHECK_PATH).with(user("operator"))).andExpect(status().isOk());
    mockMvc.perform(get(ACTUATOR_CHECK_PATH).with(user("operator"))).andExpect(status().isOk());

    verifyNoInteractions(featureFlagService);
  }

  @Test
  void protectedApiRoute_isBlockedWhenFeatureIsDisabled() throws Exception {
    when(featureFlagService.isEnabled(FeatureFlagKey.TASKS.value())).thenReturn(false);

    mockMvc.perform(get("/api/protected").with(user("operator")))
        .andExpect(status().isServiceUnavailable());
  }

  @RestController
  @FeatureRequired(FeatureFlagKey.TASKS)
  static class BypassController {

    @GetMapping(AUTH_CHECK_PATH)
    String auth() {
      return OPEN_RESPONSE;
    }

    @GetMapping(FEATURES_PATH)
    String features() {
      return OPEN_RESPONSE;
    }

    @GetMapping(ADMIN_CHECK_PATH)
    String admin() {
      return OPEN_RESPONSE;
    }

    @GetMapping(ACTUATOR_CHECK_PATH)
    String actuator() {
      return OPEN_RESPONSE;
    }

    @GetMapping("/api/protected")
    String protectedRoute() {
      return "protected";
    }
  }
}
