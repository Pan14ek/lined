package io.backend.lined.config;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import com.nimbusds.jose.proc.SecurityContext;
import io.backend.lined.featureflag.api.FeatureFlagBlockedRequestLogger;
import io.backend.lined.featureflag.api.FeatureRequiredResolver;
import io.backend.lined.featureflag.service.FeatureFlagService;
import java.time.Instant;
import java.util.List;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.TestPropertySource;
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
@TestPropertySource(properties = "lined.security.cors.allowed-origins=https://app.lined.test")
class SecurityPolicyMvcTest {

  private static final Instant NOW = Instant.now();

  @Autowired
  private MockMvc mockMvc;
  @Autowired
  private JwtEncoder jwtEncoder;

  @MockitoBean
  private FeatureFlagService featureFlagService;
  @MockitoBean
  private UserDetailsService userDetailsService;

  @Test
  void approvedPublicRoutes_areAccessibleWithoutAuthenticationOrCsrfToken() throws Exception {
    assertPublic(post("/api/users"));
    assertPublic(post("/api/auth/login"));
    assertPublic(post("/api/auth/refresh").with(csrf()));
    assertPublic(post("/api/auth/logout").with(csrf()));
    assertPublic(post("/api/auth/password-reset-requests"));
    assertPublic(post("/api/auth/password-resets"));
    assertPublic(get("/api/features"));
    assertPublic(get("/api/auth/csrf"));
    assertPublic(get("/api/calendar/feed/feed-token.ics"));
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
  void validBearerJwt_authenticatesProtectedRequest() throws Exception {
    mockMvc.perform(get("/api/private").header("Authorization", "Bearer " + validToken()))
        .andExpect(status().isOk())
        .andExpect(content().string("private:42"));
  }

  @Test
  void rejectedBearerJwt_returnsSafeUnauthorizedProblem() throws Exception {
    assertRejected(validToken() + "a");
    assertRejected(token("other-issuer", List.of("lined-api"), "42", NOW,
        NOW.plusSeconds(900)));
    assertRejected(token("lined", List.of("other-audience"), "42", NOW,
        NOW.plusSeconds(900)));
    assertRejected(token("lined", List.of("lined-api"), "not-a-number", NOW,
        NOW.plusSeconds(900)));
    assertRejected(token("lined", List.of("lined-api"), "42", NOW.minusSeconds(1000),
        NOW.minusSeconds(120)));
    assertRejected(hs512Token());
  }

  @Test
  void publicRoutes_areLimitedToTheirApprovedHttpMethods() throws Exception {
    assertUnauthorized(get("/api/auth/login"));
    assertUnauthorized(post("/api/features"));
    assertUnauthorized(post("/actuator/health"));
  }

  @Test
  void cookieAuthenticatedAuthOperations_requireCsrfToken() throws Exception {
    mockMvc.perform(post("/api/auth/refresh"))
        .andExpect(status().isForbidden());
    mockMvc.perform(post("/api/auth/logout"))
        .andExpect(status().isForbidden());
  }

  @Test
  void statelessRequest_doesNotCreateHttpSession() throws Exception {
    var result = mockMvc.perform(get("/api/features"))
        .andExpect(status().isOk())
        .andReturn();

    org.assertj.core.api.Assertions.assertThat(result.getRequest().getSession(false)).isNull();
  }

  @Test
  void allowedCorsOrigin_supportsCredentialedPreflight() throws Exception {
    mockMvc.perform(options("/api/private")
            .header("Origin", "https://app.lined.test")
            .header("Access-Control-Request-Method", "GET")
            .header("Access-Control-Request-Headers", "Authorization"))
        .andExpect(status().isOk())
        .andExpect(header().string("Access-Control-Allow-Origin", "https://app.lined.test"))
        .andExpect(header().string("Access-Control-Allow-Credentials", "true"));
  }

  @Test
  void unlistedCorsOrigin_isRejected() throws Exception {
    mockMvc.perform(options("/api/private")
            .header("Origin", "https://attacker.example")
            .header("Access-Control-Request-Method", "GET"))
        .andExpect(status().isForbidden());
  }

  @Test
  void nonApiStateChange_requiresCsrfToken() throws Exception {
    mockMvc.perform(post("/browser-action").with(user("browser-user")))
        .andExpect(status().isForbidden());

    mockMvc.perform(post("/browser-action").with(user("browser-user")).with(csrf()))
        .andExpect(status().isOk());
  }

  private void assertPublic(MockHttpServletRequestBuilder request) throws Exception {
    mockMvc.perform(request).andExpect(status().isOk());
  }

  private void assertUnauthorized(MockHttpServletRequestBuilder request) throws Exception {
    mockMvc.perform(request).andExpect(status().isUnauthorized());
  }

  private void assertRejected(String token) throws Exception {
    mockMvc.perform(get("/api/private").header("Authorization", "Bearer " + token))
        .andExpect(status().isUnauthorized())
        .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
        .andExpect(header().string("WWW-Authenticate", "Bearer"))
        .andExpect(jsonPath("$.code").value("auth.required"));
  }

  private String validToken() {
    return token("lined", List.of("lined-api"), "42", NOW, NOW.plusSeconds(900));
  }

  private String token(
      String issuer, List<String> audience, String subject, Instant issuedAt, Instant expiresAt) {
    JwtClaimsSet claims = JwtClaimsSet.builder()
        .issuer(issuer)
        .audience(audience)
        .subject(subject)
        .issuedAt(issuedAt)
        .expiresAt(expiresAt)
        .id("550e8400-e29b-41d4-a716-446655440000")
        .build();
    return jwtEncoder.encode(JwtEncoderParameters.from(
        JwsHeader.with(MacAlgorithm.HS256).type("JWT").build(), claims)).getTokenValue();
  }

  private String hs512Token() {
    JwtEncoder encoder = new NimbusJwtEncoder(new ImmutableSecret<SecurityContext>(
        new SecretKeySpec(new byte[64], "HmacSHA512")));
    JwtClaimsSet claims = JwtClaimsSet.builder()
        .issuer("lined")
        .audience(List.of("lined-api"))
        .subject("42")
        .issuedAt(NOW)
        .expiresAt(NOW.plusSeconds(900))
        .id("550e8400-e29b-41d4-a716-446655440000")
        .build();
    return encoder.encode(JwtEncoderParameters.from(
        JwsHeader.with(MacAlgorithm.HS512).type("JWT").build(), claims)).getTokenValue();
  }

  @RestController
  public static class SecurityPolicyController {

    @PostMapping({"/api/users", "/api/auth/login", "/api/auth/refresh", "/api/auth/logout",
        "/api/auth/password-reset-requests", "/api/auth/password-resets"})
    public String postPublicRoute() {
      return "public";
    }

    @GetMapping({"/api/features", "/api/auth/csrf", "/api/calendar/feed/{token}.ics",
        "/actuator/health"})
    public String getPublicRoute() {
      return "public";
    }

    @PostMapping("/browser-action")
    public String browserAction() {
      return "secured";
    }

    @GetMapping("/api/private")
    public String privateRoute(org.springframework.security.core.Authentication authentication) {
      return "private:" + authentication.getName();
    }
  }

}
