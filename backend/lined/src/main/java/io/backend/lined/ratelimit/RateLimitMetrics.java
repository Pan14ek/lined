package io.backend.lined.ratelimit;

import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Low-cardinality limiter telemetry. */
@Component
@RequiredArgsConstructor
public class RateLimitMetrics {

  private final MeterRegistry meterRegistry;

  public void allowed(String policy) {
    decision(policy, "allowed");
  }

  public void rejected(String policy) {
    decision(policy, "rejected");
  }

  public void suppressed(String policy) {
    decision(policy, "suppressed");
  }

  public void unavailable(String policy) {
    decision(policy, "unavailable");
  }

  public void storageFailure(String kind) {
    meterRegistry.counter("lined.rate_limit.storage_failures", "kind", kind).increment();
  }

  private void decision(String policy, String outcome) {
    meterRegistry.counter("lined.rate_limit.decisions", "policy", policy, "outcome", outcome)
        .increment();
  }
}
