package io.backend.lined.featureflag.api;

import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.backend.lined.config.GlobalExceptionHandler;
import io.backend.lined.featureflag.domain.FeatureFlagKey;
import io.backend.lined.featureflag.service.FeatureFlagService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@WebMvcTest(controllers = FeatureFlagBypassMvcTest.BypassController.class)
@Import({FeatureFlagWebMvcConfiguration.class, FeatureFlagInterceptor.class,
    FeatureRequiredResolver.class, FeatureFlagBlockedRequestLogger.class, GlobalExceptionHandler.class,
    FeatureFlagBypassMvcTest.BypassController.class})
class FeatureFlagBypassMvcTest {

  @Autowired
  private MockMvc mockMvc;

  @MockitoBean
  private FeatureFlagService featureFlagService;

  @Test
  void controlPlaneAndActuatorRoutes_bypassFeatureEnforcement() throws Exception {
    mockMvc.perform(get("/api/auth/check")).andExpect(status().isOk());
    mockMvc.perform(get("/api/features")).andExpect(status().isOk());
    mockMvc.perform(get("/api/admin/feature-flags/check")).andExpect(status().isOk());
    mockMvc.perform(get("/actuator/check")).andExpect(status().isOk());

    verifyNoInteractions(featureFlagService);
  }

  @Test
  void protectedApiRoute_isBlockedWhenFeatureIsDisabled() throws Exception {
    when(featureFlagService.isEnabled(FeatureFlagKey.TASKS.value())).thenReturn(false);

    mockMvc.perform(get("/api/protected")).andExpect(status().isServiceUnavailable());
  }

  @RestController
  @FeatureRequired(FeatureFlagKey.TASKS)
  static class BypassController {

    @GetMapping("/api/auth/check")
    String auth() {
      return "open";
    }

    @GetMapping("/api/features")
    String features() {
      return "open";
    }

    @GetMapping("/api/admin/feature-flags/check")
    String admin() {
      return "open";
    }

    @GetMapping("/actuator/check")
    String actuator() {
      return "open";
    }

    @GetMapping("/api/protected")
    String protectedRoute() {
      return "protected";
    }
  }
}
