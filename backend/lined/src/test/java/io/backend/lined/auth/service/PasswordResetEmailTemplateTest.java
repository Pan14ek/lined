package io.backend.lined.auth.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.OffsetDateTime;
import org.junit.jupiter.api.Test;

class PasswordResetEmailTemplateTest {

  private final PasswordResetEmailTemplate template = new PasswordResetEmailTemplate();
  private final PasswordResetDeliveryRequest request = new PasswordResetDeliveryRequest(
      "alex@example.com", "https://app.lined.test/reset-password?token=abc&next=1",
      OffsetDateTime.parse("2026-09-09T10:45:30Z"), Duration.ofMinutes(30));

  @Test
  void text_containsFallbackUrlAndExpiry() {
    assertThat(template.text(request))
        .contains("Lined", request.resetUrl(), "expires in 30 minutes")
        .contains("safely ignore");
  }

  @Test
  void html_containsEscapedPrimaryLinkAndFallbackUrl() {
    assertThat(template.html(request))
        .contains("Reset your password")
        .contains("href=\"https://app.lined.test/reset-password?token=abc&amp;next=1\"")
        .contains("Fallback URL:");
  }
}
