package io.backend.lined.ratelimit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.mock.web.MockHttpServletRequest;

class RateLimitPolicyResolverTest {

  private RateLimitPolicyResolver resolver;

  @BeforeEach
  void setUp() {
    resolver = new RateLimitPolicyResolver(new RateLimitProperties());
  }

  @Test
  void resolvesOnlyApprovedMethodAndPathPairs() {
    MockHttpServletRequest login = request("POST", "/api/auth/login");
    MockHttpServletRequest wrongMethod = request("GET", "/api/auth/login");

    assertThat(resolver.resolve(login)).get().extracting(RateLimitPolicy::id)
        .isEqualTo("login-ip");
    assertThat(resolver.resolve(wrongMethod)).isEmpty();
  }

  @ParameterizedTest
  @CsvSource({
      "POST, /api/users, register-ip",
      "POST, /api/auth/password-reset-requests, reset-request-ip",
      "POST, /api/auth/password-resets, reset-redeem-ip",
      "POST, /api/auth/refresh, refresh-ip",
      "POST, /api/auth/logout, logout-ip",
      "GET, /api/auth/csrf, csrf-ip"
  })
  void resolvesEveryRemainingProtectedRoute(String method, String path, String policyId) {
    assertThat(resolver.resolve(request(method, path))).get()
        .extracting(RateLimitPolicy::id).isEqualTo(policyId);
  }

  @Test
  void rejectsRequestWhenServletDoesNotProvidePath() {
    HttpServletRequest request = mock(HttpServletRequest.class);
    when(request.getMethod()).thenReturn("POST");
    when(request.getRequestURI()).thenReturn(null);

    assertThat(resolver.resolve(request)).isEmpty();
  }

  private MockHttpServletRequest request(String method, String path) {
    return new MockHttpServletRequest(method, path);
  }
}
