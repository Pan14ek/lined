package io.backend.lined.auth.service;

import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import java.time.Duration;
import java.time.OffsetDateTime;
import org.junit.jupiter.api.Test;

class PasswordResetDeliveryRequestTest {

  @Test
  void rejectsHeaderInjectionInRecipient() {
    assertThatIllegalArgumentException().isThrownBy(() -> new PasswordResetDeliveryRequest(
        "victim@example.com\r\nBcc: attacker@example.com", "https://app.lined.test/reset-password",
        OffsetDateTime.now(), Duration.ofMinutes(30)));
  }

  @Test
  void rejectsNonHttpResetUrl() {
    assertThatIllegalArgumentException().isThrownBy(() -> new PasswordResetDeliveryRequest(
        "alex@example.com", "javascript:alert(1)", OffsetDateTime.now(), Duration.ofMinutes(30)));
  }
}
