package io.backend.lined.ratelimit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.backend.lined.config.SecurityProblemDetailsWriter;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import jakarta.servlet.FilterChain;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class RateLimitFilterTest {

  private RateLimitStore store;
  private RateLimitFilter filter;

  @BeforeEach
  void setUp() {
    RateLimitProperties properties = new RateLimitProperties();
    properties.setKeySecret("test-rate-limit-key-secret-with-at-least-32-bytes");
    store = mock(RateLimitStore.class);
    filter = new RateLimitFilter(properties, new RateLimitPolicyResolver(properties),
        new ClientAddressResolver(properties), new RateLimitKeyFactory(properties), store,
        new RateLimitMetrics(new SimpleMeterRegistry()),
        new SecurityProblemDetailsWriter(new ObjectMapper()));
  }

  @Test
  void rejectedAdmissionWritesProblemAndDoesNotReachHandler() throws Exception {
    when(store.tryConsume(any(), any())).thenReturn(new RateLimitDecision(false, Duration.ofSeconds(4).toNanos()));
    MockHttpServletRequest request = request("POST", "/api/auth/login");
    MockHttpServletResponse response = new MockHttpServletResponse();
    AtomicBoolean reached = new AtomicBoolean();
    FilterChain chain = (ignoredRequest, ignoredResponse) -> reached.set(true);

    filter.doFilter(request, response, chain);

    assertThat(response.getStatus()).isEqualTo(429);
    assertThat(response.getHeader("Retry-After")).isEqualTo("4");
    assertThat(response.getContentType()).contains("application/problem+json");
    assertThat(response.getContentAsString()).contains("rate_limit.exceeded");
    assertThat(reached).isFalse();
  }

  @Test
  void allowedAdmissionReachesHandler() throws Exception {
    when(store.tryConsume(any(), any())).thenReturn(new RateLimitDecision(true, 0));
    AtomicBoolean reached = new AtomicBoolean();

    filter.doFilter(request("POST", "/api/auth/login"), new MockHttpServletResponse(),
        (ignoredRequest, ignoredResponse) -> reached.set(true));

    assertThat(reached).isTrue();
    verify(store).tryConsume(any(), any());
  }

  private MockHttpServletRequest request(String method, String path) {
    MockHttpServletRequest request = new MockHttpServletRequest(method, path);
    request.setRemoteAddr("127.0.0.1");
    return request;
  }
}
