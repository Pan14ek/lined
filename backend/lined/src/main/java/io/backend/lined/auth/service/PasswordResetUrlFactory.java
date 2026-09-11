package io.backend.lined.auth.service;

import java.util.Objects;
import java.nio.charset.StandardCharsets;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriUtils;
import org.springframework.web.util.UriComponentsBuilder;

/** Builds reset URLs only from the trusted configured frontend origin. */
@Component
public class PasswordResetUrlFactory {

  private final PasswordResetMailProperties properties;

  public PasswordResetUrlFactory(PasswordResetMailProperties properties) {
    this.properties = properties;
  }

  public String create(String rawToken) {
    Objects.requireNonNull(rawToken, "rawToken");
    String baseUrl = UriComponentsBuilder.fromUriString(properties.getFrontendBaseUrl())
        .path("/reset-password")
        .build()
        .toUriString();
    return baseUrl + "?token=" + UriUtils.encode(rawToken, StandardCharsets.UTF_8);
  }
}
