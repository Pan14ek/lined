package io.backend.lined.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.backend.lined.featureflag.api.FeatureFlagBlockedRequestLogger;
import io.backend.lined.featureflag.api.FeatureRequiredResolver;
import io.backend.lined.featureflag.service.FeatureFlagService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@WebMvcTest(controllers = SecurityPolicyMvcTest.SecurityPolicyController.class)
@Import({SecurityConfig.class, SecurityProblemDetailsWriter.class,
    ProblemAuthenticationEntryPoint.class, ProblemAccessDeniedHandler.class,
    FeatureRequiredResolver.class, FeatureFlagBlockedRequestLogger.class,
    SecurityPolicyMvcTest.SecurityPolicyController.class})
class SecurityPolicyMvcTest {

  @Autowired
  private MockMvc mockMvc;

  @MockitoBean
  private FeatureFlagService featureFlagService;

  @Test
  void approvedPublicRoutes_areAccessibleWithoutAuthentication() throws Exception {
    assertPublic(post("/api/users"));
    assertPublic(post("/api/auth/login"));
    assertPublic(post("/api/auth/refresh"));
    assertPublic(post("/api/auth/password-reset-requests"));
    assertPublic(post("/api/auth/password-resets"));
    assertPublic(get("/api/features"));
    assertPublic(get("/actuator/health"));
  }

  @Test
  void unlistedRoute_returnsSafeUnauthorizedProblem() throws Exception {
    mockMvc.perform(get("/api/private"))
        .andExpect(status().isUnauthorized())
        .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
        .andExpect(header().string("WWW-Authenticate", "Bearer"))
        .andExpect(jsonPath("$.type")
            .value("https://lined.app/problems/authentication-required"))
        .andExpect(jsonPath("$.title").value("Authentication required"))
        .andExpect(jsonPath("$.status").value(401))
        .andExpect(jsonPath("$.detail")
            .value("Authentication is required to access this resource."))
        .andExpect(jsonPath("$.instance").value("/api/private"))
        .andExpect(jsonPath("$.code").value("auth.required"));
  }

  @Test
  void publicRoutes_areLimitedToTheirApprovedHttpMethods() throws Exception {
    assertUnauthorized(get("/api/auth/login"));
    assertUnauthorized(post("/api/features"));
    assertUnauthorized(post("/actuator/health"));
  }

  @Test
  void statelessRequest_doesNotCreateHttpSession() throws Exception {
    var result = mockMvc.perform(get("/api/features"))
        .andExpect(status().isOk())
        .andReturn();

    org.assertj.core.api.Assertions.assertThat(result.getRequest().getSession(false)).isNull();
  }

  private void assertPublic(MockHttpServletRequestBuilder request) throws Exception {
    mockMvc.perform(request).andExpect(status().isOk());
  }

  private void assertUnauthorized(MockHttpServletRequestBuilder request) throws Exception {
    mockMvc.perform(request).andExpect(status().isUnauthorized());
  }

  @RestController
  public static class SecurityPolicyController {

    @PostMapping({"/api/users", "/api/auth/login", "/api/auth/refresh",
        "/api/auth/password-reset-requests", "/api/auth/password-resets"})
    public String postPublicRoute() {
      return "public";
    }

    @GetMapping({"/api/features", "/actuator/health"})
    public String getPublicRoute() {
      return "public";
    }
  }

}
