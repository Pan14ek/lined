package io.backend.lined.ratelimit;

import io.backend.lined.config.SecurityProblemDetailsWriter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;

/** Applies the transport-side IP policies before authentication handlers and mutations. */
@org.springframework.stereotype.Component
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
    if (!properties.isEnabled() || "OPTIONS".equalsIgnoreCase(request.getMethod())) {
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
      RateLimitDecision decision = store.tryConsume(policy.get(),
          keyFactory.ipKey(addressResolver.resolve(request)));
      if (decision.allowed()) {
        metrics.allowed(policyId);
        filterChain.doFilter(request, response);
        return;
      }
      metrics.rejected(policyId);
      problemWriter.writeRateLimited(request, response, decision.retryAfterSeconds());
    } catch (RateLimitStorageException ex) {
      metrics.storageFailure("capacity");
      if ("logout-ip".equals(policyId)) {
        metrics.unavailable(policyId);
        filterChain.doFilter(request, response);
      } else {
        metrics.unavailable(policyId);
        problemWriter.writeUnavailable(request, response);
      }
    }
  }
}
