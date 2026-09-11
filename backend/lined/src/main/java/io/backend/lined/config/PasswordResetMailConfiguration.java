package io.backend.lined.config;

import io.backend.lined.auth.service.PasswordResetMailProperties;
import java.util.Properties;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

/** Creates the provider-neutral SMTP sender from external password-reset mail settings. */
@Configuration
@RequiredArgsConstructor
public class PasswordResetMailConfiguration {

  private final PasswordResetMailProperties properties;

  @Bean
  public JavaMailSender passwordResetMailSender() {
    JavaMailSenderImpl sender = new JavaMailSenderImpl();
    sender.setHost(properties.getHost());
    sender.setPort(properties.getPort());
    sender.setUsername(properties.getUsername());
    sender.setPassword(properties.getPassword());
    Properties mailProperties = sender.getJavaMailProperties();
    mailProperties.put("mail.smtp.auth", String.valueOf(!properties.getUsername().isBlank()));
    mailProperties.put("mail.smtp.starttls.enable", String.valueOf(properties.isTlsEnabled()));
    mailProperties.put("mail.smtp.starttls.required", String.valueOf(properties.isTlsEnabled()));
    return sender;
  }
}
