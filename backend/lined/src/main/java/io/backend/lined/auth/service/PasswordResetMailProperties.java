package io.backend.lined.auth.service;

import jakarta.annotation.PostConstruct;
import java.net.URI;
import java.net.URISyntaxException;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** External SMTP and trusted frontend configuration for password-reset delivery. */
@Getter
@Setter
@ConfigurationProperties("lined.auth.mail")
public class PasswordResetMailProperties {

  private boolean enabled = true;
  private String frontendBaseUrl = "http://localhost:5173";
  private String host = "localhost";
  private int port = 1025;
  private String username = "";
  private String password = "";
  private String from = "no-reply@lined.local";
  private boolean tlsEnabled;
  private boolean requireHttps;
  private boolean requireCredentials;

  /** Fails startup before accepting requests when enabled delivery is unsafe or incomplete. */
  @PostConstruct
  void validate() {
    if (!enabled) {
      return;
    }
    requireText(host, "lined.auth.mail.host");
    requireText(from, "lined.auth.mail.from");
    requireText(frontendBaseUrl, "lined.auth.mail.frontend-base-url");
    if (port < 1 || port > 65535) {
      throw new IllegalStateException("lined.auth.mail.port must be between 1 and 65535");
    }
    validateFrontendBaseUrl();
    if (requireCredentials) {
      requireText(username, "lined.auth.mail.username");
      requireText(password, "lined.auth.mail.password");
    }
  }

  private void validateFrontendBaseUrl() {
    try {
      URI uri = new URI(frontendBaseUrl);
      boolean trustedScheme = "http".equalsIgnoreCase(uri.getScheme())
          || "https".equalsIgnoreCase(uri.getScheme());
      if (!uri.isAbsolute() || uri.getHost() == null || !trustedScheme
          || uri.getUserInfo() != null || uri.getRawQuery() != null || uri.getRawFragment() != null
          || (requireHttps && !"https".equalsIgnoreCase(uri.getScheme()))) {
        throw new IllegalStateException("lined.auth.mail.frontend-base-url must be a trusted origin");
      }
    } catch (URISyntaxException ex) {
      throw new IllegalStateException("lined.auth.mail.frontend-base-url must be a valid URI", ex);
    }
  }

  private void requireText(String value, String property) {
    if (value == null || value.isBlank()) {
      throw new IllegalStateException(property + " is required when password reset delivery is enabled");
    }
  }
}
