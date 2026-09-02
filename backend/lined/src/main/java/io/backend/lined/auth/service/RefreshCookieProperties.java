package io.backend.lined.auth.service;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/** Validated transport settings for the web refresh-token cookie. */
@ConfigurationProperties("lined.security.cookie")
public record RefreshCookieProperties(
    @DefaultValue("lined_refresh") String refreshName,
    @DefaultValue("true") boolean secure,
    @DefaultValue("Lax") String sameSite,
    @DefaultValue("/api/auth") String path
) {

  public RefreshCookieProperties {
    if (refreshName == null || refreshName.isBlank() || containsCookieNameSeparator(refreshName)) {
      throw new IllegalArgumentException("Refresh cookie name is invalid");
    }
    refreshName = refreshName.trim();
    sameSite = normalizeSameSite(sameSite);
    if (path == null || !path.startsWith("/") || path.contains(";")) {
      throw new IllegalArgumentException("Refresh cookie path is invalid");
    }
  }

  private static String normalizeSameSite(String value) {
    if (value == null) {
      throw new IllegalArgumentException("Refresh cookie SameSite is required");
    }
    if ("lax".equalsIgnoreCase(value)) {
      return "Lax";
    }
    if ("strict".equalsIgnoreCase(value)) {
      return "Strict";
    }
    throw new IllegalArgumentException("Refresh cookie SameSite must be Lax or Strict");
  }

  private static boolean containsCookieNameSeparator(String value) {
    return value.chars().anyMatch(character -> character == ';' || Character.isWhitespace(character));
  }
}
