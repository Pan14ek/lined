package io.backend.lined.auth.service;

import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Records low-cardinality password-reset delivery and redemption outcomes. */
@Component
@RequiredArgsConstructor
public class PasswordResetMetrics {

  private static final String REQUEST_ACCEPTED = "lined.password_reset.request.accepted";
  private static final String DELIVERY = "lined.password_reset.delivery";
  private static final String REDEMPTION = "lined.password_reset.redemption";
  private static final String OUTCOME_TAG = "outcome";

  private final MeterRegistry meterRegistry;

  public void requestAccepted() {
    meterRegistry.counter(REQUEST_ACCEPTED).increment();
  }

  public void deliverySucceeded() {
    meterRegistry.counter(DELIVERY, OUTCOME_TAG, "success").increment();
  }

  public void deliveryFailed() {
    meterRegistry.counter(DELIVERY, OUTCOME_TAG, "failure").increment();
  }

  public void redemptionSucceeded() {
    meterRegistry.counter(REDEMPTION, OUTCOME_TAG, "success").increment();
  }

  public void redemptionFailed() {
    meterRegistry.counter(REDEMPTION, OUTCOME_TAG, "failure", "reason", "invalid").increment();
  }
}
