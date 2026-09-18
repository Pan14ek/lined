package io.backend.lined.ratelimit;

import io.backend.lined.config.SecurityProblemDetailsWriter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** Applies the transport-side IP policies before authentication handlers and mutations. */
@Component
@ConditionalOnBean(RateLimitStore.class)
@RequiredArgsConstructor
public class RateLimitFilter extends OncePerRequestFilter {

  private final RateLimitProperties properties;
  private final RateLimitPolicyResolver policyResolver;
  private final ClientAddressResolver addressResolver;
  private final RateLimitKeyFactory keyFactory;
  private final RateLimitStore store;
  private final RateLimitMetrics metrics;
  private final SecurityProblemDetailsWriter problemWriter;

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                  FilterChain filterChain) throws ServletException, IOException {
    if (shouldBypass(request)) {
      filterChain.doFilter(request, response);
      return;
    }
    Optional<RateLimitPolicy> policy = policyResolver.resolve(request);
    if (policy.isEmpty()) {
      filterChain.doFilter(request, response);
      return;
    }
    String policyId = policy.get().id();
    try {
      admitRequest(request, response, filterChain, policy.get());
    } catch (RateLimitStorageException ex) {
      handleStorageFailure(request, response, filterChain, policyId);
    }
  }

  /** Identifies requests that do not require transport-side admission. */
  private boolean shouldBypass(HttpServletRequest request) {
    return !properties.isEnabled() || "OPTIONS".equalsIgnoreCase(request.getMethod());
  }

  /** Consumes the selected IP bucket and either continues or writes the rejection response. */
  private void admitRequest(HttpServletRequest request, HttpServletResponse response,
                            FilterChain filterChain, RateLimitPolicy policy)
      throws ServletException, IOException {
    RateLimitDecision decision = store.tryConsume(policy,
        keyFactory.ipKey(addressResolver.resolve(request)));
    if (decision.allowed()) {
      metrics.allowed(policy.id());
      filterChain.doFilter(request, response);
      return;
    }
    metrics.rejected(policy.id());
    problemWriter.writeRateLimited(request, response, decision.retryAfterSeconds());
  }

  /** Applies the fail-closed policy while preserving logout availability. */
  private void handleStorageFailure(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain, String policyId)
      throws ServletException, IOException {
    metrics.storageFailure("capacity");
    metrics.unavailable(policyId);
    if ("logout-ip".equals(policyId)) {
      filterChain.doFilter(request, response);
      return;
    }
    problemWriter.writeUnavailable(request, response);
  }
}
