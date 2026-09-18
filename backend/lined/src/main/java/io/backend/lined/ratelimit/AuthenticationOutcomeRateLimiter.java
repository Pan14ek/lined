package io.backend.lined.ratelimit;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Counts failed credential outcomes independently from the source-IP admission bucket. */
@Component
@RequiredArgsConstructor
public class AuthenticationOutcomeRateLimiter {

  private final RateLimitProperties properties;
  private final RateLimitKeyFactory keyFactory;
  private final RateLimitStore store;
  private final RateLimitMetrics metrics;

  public void recordFailure(String identifier) {
    String normalized = keyFactory.normalizeIdentifier(identifier);
    if (normalized == null) {
      return;
    }
    RateLimitPolicy policy = properties.policy("login-failed-identifier");
    try {
      RateLimitDecision decision = store.tryConsume(policy, keyFactory.identifierKey(normalized));
      if (decision.allowed()) {
        metrics.allowed(policy.id());
      } else {
        metrics.rejected(policy.id());
        throw new RateLimitExceededException(decision.retryAfterSeconds());
      }
    } catch (RateLimitStorageException ex) {
      metrics.storageFailure("capacity");
      metrics.unavailable(policy.id());
      throw new RateLimitUnavailableException();
    }
  }

  public void recordSuccess(String identifier) {
    String normalized = keyFactory.normalizeIdentifier(identifier);
    if (normalized != null) {
      store.remove(properties.policy("login-failed-identifier"), keyFactory.identifierKey(normalized));
    }
  }
}
