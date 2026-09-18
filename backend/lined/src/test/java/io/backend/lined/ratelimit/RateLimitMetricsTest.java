package io.backend.lined.ratelimit;

import static org.assertj.core.api.Assertions.assertThat;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;

class RateLimitMetricsTest {

  @Test
  void recordsEachDecisionAndStorageFailureOutcome() {
    SimpleMeterRegistry registry = new SimpleMeterRegistry();
    RateLimitMetrics metrics = new RateLimitMetrics(registry);

    metrics.allowed("login-ip");
    metrics.rejected("login-ip");
    metrics.suppressed("reset-delivery-identifier");
    metrics.unavailable("login-ip");
    metrics.storageFailure("capacity");

    assertThat(registry.get("lined.rate_limit.decisions")
        .tag("policy", "login-ip").tag("outcome", "allowed").counter().count())
        .isEqualTo(1.0);
    assertThat(registry.get("lined.rate_limit.decisions")
        .tag("policy", "login-ip").tag("outcome", "rejected").counter().count())
        .isEqualTo(1.0);
    assertThat(registry.get("lined.rate_limit.decisions")
        .tag("policy", "reset-delivery-identifier").tag("outcome", "suppressed")
        .counter().count()).isEqualTo(1.0);
    assertThat(registry.get("lined.rate_limit.decisions")
        .tag("policy", "login-ip").tag("outcome", "unavailable").counter().count())
        .isEqualTo(1.0);
    assertThat(registry.get("lined.rate_limit.storage_failures")
        .tag("kind", "capacity").counter().count()).isEqualTo(1.0);
  }
}
