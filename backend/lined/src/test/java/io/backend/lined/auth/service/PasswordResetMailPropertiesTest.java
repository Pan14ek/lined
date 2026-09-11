package io.backend.lined.auth.service;

import static org.assertj.core.api.Assertions.assertThatCode;
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

  @Test
  void validate_allowsDisabledDeliveryWithoutProductionSettings() {
    PasswordResetMailProperties properties = new PasswordResetMailProperties();
    properties.setEnabled(false);
    properties.setHost("");
    properties.setFrom("");
    properties.setFrontendBaseUrl("");

    assertThatCode(properties::validate).doesNotThrowAnyException();
  }

  @Test
  void validate_rejectsInvalidPort() {
    PasswordResetMailProperties properties = new PasswordResetMailProperties();
    properties.setPort(0);

    assertThatIllegalStateException().isThrownBy(properties::validate)
        .withMessageContaining("port");
  }

  @Test
  void validate_requiresCredentialsWhenConfigured() {
    PasswordResetMailProperties properties = new PasswordResetMailProperties();
    properties.setRequireCredentials(true);

    assertThatIllegalStateException().isThrownBy(properties::validate)
        .withMessageContaining("username");
  }

  @Test
  void validate_rejectsMalformedFrontendBaseUrl() {
    PasswordResetMailProperties properties = new PasswordResetMailProperties();
    properties.setFrontendBaseUrl("http://[");

    assertThatIllegalStateException().isThrownBy(properties::validate)
        .withMessageContaining("valid URI");
  }

  @Test
  void validate_acceptsHttpsWhenRequired() {
    PasswordResetMailProperties properties = new PasswordResetMailProperties();
    properties.setRequireHttps(true);
    properties.setFrontendBaseUrl("https://app.lined.test");

    assertThatCode(properties::validate).doesNotThrowAnyException();
  }
}
