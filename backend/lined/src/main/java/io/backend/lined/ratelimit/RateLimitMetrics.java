package io.backend.lined.ratelimit;

import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Low-cardinality limiter telemetry. */
@Component
@RequiredArgsConstructor
public class RateLimitMetrics {

  private final MeterRegistry meterRegistry;

  /** Increments the low-cardinality allowed-decision counter.
   *
   * @param policy internal policy name
   */
  public void allowed(String policy) {
    decision(policy, "allowed");
  }

  /** Increments the low-cardinality rejected-decision counter.
   *
   * @param policy internal policy name
   */
  public void rejected(String policy) {
    decision(policy, "rejected");
  }

  /** Increments the low-cardinality suppressed-decision counter.
   *
   * @param policy internal policy name
   */
  public void suppressed(String policy) {
    decision(policy, "suppressed");
  }

  /** Increments the low-cardinality unavailable-decision counter.
   *
   * @param policy internal policy name
   */
  public void unavailable(String policy) {
    decision(policy, "unavailable");
  }

  /** Records one storage failure by its non-sensitive failure kind.
   *
   * @param kind bounded failure category
   */
  public void storageFailure(String kind) {
    meterRegistry.counter("lined.rate_limit.storage_failures", "kind", kind).increment();
  }

  private void decision(String policy, String outcome) {
    meterRegistry.counter("lined.rate_limit.decisions", "policy", policy, "outcome", outcome)
        .increment();
  }
}
