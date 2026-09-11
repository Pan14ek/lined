package io.backend.lined.auth.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class PasswordResetUrlFactoryTest {

  @Test
  void create_usesConfiguredFrontendOriginAndEncodesToken() {
    PasswordResetMailProperties properties = new PasswordResetMailProperties();
    properties.setFrontendBaseUrl("https://app.lined.test/account/");

    String url = new PasswordResetUrlFactory(properties).create("abc/token");

    assertThat(url).isEqualTo("https://app.lined.test/account/reset-password?token=abc%2Ftoken");
  }
}
