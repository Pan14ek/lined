package io.backend.lined.ratelimit;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Applies identifier delivery suppression while preserving the generic 202 reset contract. */
@Component
@RequiredArgsConstructor
public class PasswordResetDeliveryGuard {

  private final RateLimitProperties properties;
  private final RateLimitKeyFactory keyFactory;
  private final RateLimitStore store;
  private final RateLimitMetrics metrics;

  /** Consumes delivery budget while preserving the generic reset response for suppressed users.
   *
   * @param identifier submitted email address or username
   * @return {@code true} when delivery may proceed
   * @throws RateLimitUnavailableException when the limiter cannot make a safe decision
   */
  public boolean mayDeliver(String identifier) {
    String normalized = keyFactory.normalizeIdentifier(identifier);
    if (normalized == null) {
      return false;
    }
    RateLimitPolicy policy = properties.policy("reset-delivery-identifier");
    try {
      RateLimitDecision decision = store.tryConsume(policy, keyFactory.identifierKey(normalized));
      if (decision.allowed()) {
        metrics.allowed(policy.id());
        return true;
      }
      metrics.suppressed(policy.id());
      return false;
    } catch (RateLimitStorageException ex) {
      metrics.storageFailure("capacity");
      metrics.unavailable(policy.id());
      throw new RateLimitUnavailableException();
    }
  }
}
