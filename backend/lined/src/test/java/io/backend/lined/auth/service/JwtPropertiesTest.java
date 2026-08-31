package io.backend.lined.auth.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import org.junit.jupiter.api.Test;

class JwtPropertiesTest {

  private static final String SECRET = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=";

  @Test
  void constructor_rejectsMissingSecret() {
    assertThatThrownBy(() -> properties(" "))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("JWT signing secret is required");
  }

  @Test
  void constructor_rejectsMalformedBase64Secret() {
    assertThatThrownBy(() -> properties("not valid Base64"))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("JWT signing secret must be valid Base64");
  }

  @Test
  void constructor_rejectsShortDecodedSecret() {
    assertThatThrownBy(() -> properties("c2hvcnQ="))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("JWT signing secret must decode to at least 32 bytes");
  }

  private JwtProperties properties(String secret) {
    return new JwtProperties("lined", "lined-api", Duration.ofMinutes(15), Duration.ofMinutes(1),
        secret);
  }

}
