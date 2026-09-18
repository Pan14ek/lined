package io.backend.lined.ratelimit;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;

/** Allowlisted transport policy mapping with no user-controlled route labels. */
@Component
@RequiredArgsConstructor
public class RateLimitPolicyResolver {

  private final RateLimitProperties properties;

  public Optional<RateLimitPolicy> resolve(HttpServletRequest request) {
    String path = request.getRequestURI();
    String name = null;
    if (is(request, HttpMethod.POST, "/api/auth/login")) {
      name = "login-ip";
    } else if (is(request, HttpMethod.POST, "/api/users")) {
      name = "register-ip";
    } else if (is(request, HttpMethod.POST, "/api/auth/password-reset-requests")) {
      name = "reset-request-ip";
    } else if (is(request, HttpMethod.POST, "/api/auth/password-resets")) {
      name = "reset-redeem-ip";
    } else if (is(request, HttpMethod.POST, "/api/auth/refresh")) {
      name = "refresh-ip";
    } else if (is(request, HttpMethod.POST, "/api/auth/logout")) {
      name = "logout-ip";
    } else if (is(request, HttpMethod.GET, "/api/auth/csrf")) {
      name = "csrf-ip";
    }
    return name == null || path == null ? Optional.empty() : Optional.of(properties.policy(name));
  }

  private boolean is(HttpServletRequest request, HttpMethod method, String path) {
    return method.matches(request.getMethod()) && path.equals(request.getRequestURI());
  }
}
