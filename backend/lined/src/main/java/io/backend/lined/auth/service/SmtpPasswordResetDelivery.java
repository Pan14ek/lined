package io.backend.lined.auth.service;

import jakarta.mail.MessagingException;
import java.nio.charset.StandardCharsets;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

/** SMTP adapter for transactional password-reset messages. */
@Component
@RequiredArgsConstructor
public class SmtpPasswordResetDelivery implements PasswordResetDelivery {

  private static final String SUBJECT = "Reset your Lined password";

  private final JavaMailSender mailSender;
  private final PasswordResetMailProperties properties;
  private final PasswordResetEmailTemplate template;

  @Override
  public void deliver(PasswordResetDeliveryRequest request) {
    if (!properties.isEnabled()) {
      return;
    }
    try {
      var message = mailSender.createMimeMessage();
      var helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
      helper.setFrom(properties.getFrom());
      helper.setTo(request.recipient());
      helper.setSubject(SUBJECT);
      helper.setText(template.text(request), template.html(request));
      mailSender.send(message);
    } catch (MessagingException | MailException ex) {
      throw new PasswordResetDeliveryException(ex);
    }
  }
}
