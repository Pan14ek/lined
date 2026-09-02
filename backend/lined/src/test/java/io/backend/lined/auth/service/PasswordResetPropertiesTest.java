package io.backend.lined.auth.service;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
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
}
