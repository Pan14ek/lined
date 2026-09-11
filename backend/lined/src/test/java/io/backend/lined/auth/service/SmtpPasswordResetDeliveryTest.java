package io.backend.lined.auth.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.time.OffsetDateTime;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;

@ExtendWith(MockitoExtension.class)
class SmtpPasswordResetDeliveryTest {

  @Mock
  private JavaMailSender mailSender;
  @Mock
  private PasswordResetEmailTemplate template;
  @Mock
  private MimeMessage message;

  @Test
  void mapsProviderFailureToSanitizedDeliveryException() {
    PasswordResetMailProperties properties = new PasswordResetMailProperties();
    properties.setEnabled(true);
    when(mailSender.createMimeMessage()).thenReturn(message);
    when(template.text(org.mockito.ArgumentMatchers.any())).thenReturn("text");
    when(template.html(org.mockito.ArgumentMatchers.any())).thenReturn("<p>html</p>");
    doThrow(new MailSendException("smtp-password-secret"))
        .when(mailSender).send(message);
    var delivery = new SmtpPasswordResetDelivery(mailSender, properties, template);
    var request = new PasswordResetDeliveryRequest("alex@example.com",
        "https://app.lined.test/reset-password?token=opaque", OffsetDateTime.now(),
        Duration.ofMinutes(30));

    assertThatThrownBy(() -> delivery.deliver(request))
        .isInstanceOf(PasswordResetDeliveryException.class)
        .hasMessage("Password reset delivery failed")
        .hasMessageNotContaining("smtp-password-secret");
    verify(mailSender).send(message);
  }
}
