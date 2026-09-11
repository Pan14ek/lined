package io.backend.lined.auth.service;

import static org.assertj.core.api.Assertions.assertThatIllegalStateException;

import org.junit.jupiter.api.Test;

class PasswordResetMailPropertiesTest {

  @Test
  void validate_requiresProductionSmtpHost() {
    PasswordResetMailProperties properties = new PasswordResetMailProperties();
    properties.setHost("");

    assertThatIllegalStateException().isThrownBy(properties::validate)
        .withMessageContaining("lined.auth.mail.host");
  }

  @Test
  void validate_requiresHttpsWhenProductionRequiresIt() {
    PasswordResetMailProperties properties = new PasswordResetMailProperties();
    properties.setRequireHttps(true);

    assertThatIllegalStateException().isThrownBy(properties::validate)
        .withMessageContaining("frontend-base-url");
  }
}
