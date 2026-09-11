package io.backend.lined.auth.service;

import static org.assertj.core.api.Assertions.assertThat;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;

class PasswordResetMetricsTest {

  @Test
  void recordsRequestDeliveryAndRedemptionOutcomes() {
    var registry = new SimpleMeterRegistry();
    var metrics = new PasswordResetMetrics(registry);

    metrics.requestAccepted();
    metrics.deliverySucceeded();
    metrics.deliveryFailed();
    metrics.redemptionSucceeded();
    metrics.redemptionFailed();

    assertThat(registry.counter("lined.password_reset.request.accepted").count()).isEqualTo(1.0);
    assertThat(registry.counter("lined.password_reset.delivery", "outcome", "success").count())
        .isEqualTo(1.0);
    assertThat(registry.counter("lined.password_reset.delivery", "outcome", "failure").count())
        .isEqualTo(1.0);
    assertThat(registry.counter("lined.password_reset.redemption", "outcome", "success").count())
        .isEqualTo(1.0);
    assertThat(registry.counter("lined.password_reset.redemption", "outcome", "failure",
        "reason", "invalid").count()).isEqualTo(1.0);
  }
}
