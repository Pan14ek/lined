package io.backend.lined.auth.service;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import java.time.Duration;
import org.junit.jupiter.api.Test;

class PasswordResetPropertiesTest {

  @Test
  void validator_rejectsMissingResetTokenSecret() {
    PasswordResetProperties properties = new PasswordResetProperties();

    try (ValidatorFactory factory = Validation.buildDefaultValidatorFactory()) {
      Validator validator = factory.getValidator();
      assertThat(validator.validate(properties))
          .anyMatch(
              violation -> violation.getPropertyPath().toString().equals("resetTokenSecret"));
    }
  }

  @Test
  void validator_rejectsShortResetTokenSecret() {
    PasswordResetProperties properties = new PasswordResetProperties();
    properties.setResetTokenSecret("too-short");

    try (ValidatorFactory factory = Validation.buildDefaultValidatorFactory()) {
      Validator validator = factory.getValidator();
      assertThat(validator.validate(properties))
          .anyMatch(
              violation -> violation.getPropertyPath().toString().equals("resetTokenSecret"));
    }
  }

  @Test
  void exposesTokenTtlAndAcceptsPositiveValue() {
    PasswordResetProperties properties = new PasswordResetProperties();
    properties.setTokenTtl(Duration.ofMinutes(15));

    assertThat(properties.getTokenTtl()).isEqualTo(Duration.ofMinutes(15));
    assertThat(properties.hasPositiveTokenTtl()).isTrue();
  }

  @Test
  void validator_rejectsNonPositiveTokenTtl() {
    PasswordResetProperties properties = new PasswordResetProperties();
    properties.setTokenTtl(Duration.ZERO);

    try (ValidatorFactory factory = Validation.buildDefaultValidatorFactory()) {
      Validator validator = factory.getValidator();
      assertThat(validator.validate(properties))
          .anyMatch(
              violation -> violation.getMessage().contains("tokenTtl"));
    }
  }
}
