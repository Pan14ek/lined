package io.backend.lined.ratelimit;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import java.time.Duration;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

class RateLimitPropertiesTest {

  private static ValidatorFactory validatorFactory;
  private static Validator validator;

  @BeforeAll
  static void setUpValidator() {
    validatorFactory = Validation.buildDefaultValidatorFactory();
    validator = validatorFactory.getValidator();
  }

  @AfterAll
  static void closeValidator() {
    validatorFactory.close();
  }

  @Test
  void defaults_areValid() {
    RateLimitProperties properties = validProperties();

    assertThat(validator.validate(properties)).isEmpty();
  }

  @Test
  void invalidPolicy_isRejectedByBeanValidation() {
    RateLimitProperties properties = validProperties();
    properties.getPolicies().put("login-ip",
        new RateLimitProperties.PolicyProperties(0, Duration.ofMinutes(1)));

    assertThat(validator.validate(properties))
        .anyMatch(violation -> violation.getPropertyPath().toString().contains("capacity"));
  }

  @Test
  void missingRequiredPolicy_isRejectedByBeanValidation() {
    RateLimitProperties properties = validProperties();
    properties.getPolicies().remove("login-ip");

    assertThat(validator.validate(properties))
        .anyMatch(violation -> violation.getMessage().contains("required"));
  }

  @Test
  void decision_waitRounding_handlesMaximumLongWithoutOverflow() {
    RateLimitDecision decision = new RateLimitDecision(false, Long.MAX_VALUE);

    assertThat(decision.retryAfterSeconds()).isGreaterThan(1);
  }

  @Test
  void decision_rejectsNegativeWaitDuration() {
    org.assertj.core.api.Assertions.assertThatThrownBy(
        () -> new RateLimitDecision(false, -1))
        .isInstanceOf(IllegalArgumentException.class);
  }

  private RateLimitProperties validProperties() {
    RateLimitProperties properties = new RateLimitProperties();
    properties.setKeySecret("test-rate-limit-key-secret-with-at-least-32-bytes");
    return properties;
  }
}
