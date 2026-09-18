package io.backend.lined.ratelimit;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
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

  private MockHttpServletRequest request(String method, String path) {
    MockHttpServletRequest request = new MockHttpServletRequest(method, path);
    return request;
  }
}
