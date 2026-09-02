package io.backend.lined.config;

import java.net.URI;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/** Validated cross-origin transport settings for browser API clients. */
@ConfigurationProperties("lined.security.cors")
public record CorsProperties(
    @DefaultValue("true") boolean allowCredentials,
    List<String> allowedOrigins,
    @DefaultValue("false") boolean requireHttps
) {

  private static final Set<String> SUPPORTED_SCHEMES = Set.of("http", "https");

  public CorsProperties {
    allowedOrigins = normalizeOrigins(allowedOrigins);
    if (requireHttps && allowedOrigins.stream().anyMatch(origin -> !origin.startsWith("https://"))) {
      throw new IllegalArgumentException("Production CORS origins must use HTTPS");
    }
  }

  private static List<String> normalizeOrigins(List<String> origins) {
    if (origins == null) {
      return List.of();
    }
    return origins.stream()
        .filter(Objects::nonNull)
        .map(String::trim)
        .filter(origin -> !origin.isEmpty())
        .peek(CorsProperties::rejectWildcard)
        .peek(CorsProperties::validateOrigin)
        .distinct()
        .toList();
  }

  private static void validateOrigin(String origin) {
    URI parsed;
    try {
      parsed = URI.create(origin);
    } catch (IllegalArgumentException ex) {
      throw new IllegalArgumentException("CORS origin is invalid", ex);
    }
    if (!SUPPORTED_SCHEMES.contains(parsed.getScheme())
        || parsed.getHost() == null
        || parsed.getRawPath() != null && !parsed.getRawPath().isEmpty()
        || parsed.getRawQuery() != null
        || parsed.getRawFragment() != null
        || parsed.getUserInfo() != null) {
      throw new IllegalArgumentException("CORS origin is invalid");
    }
  }

  private static void rejectWildcard(String origin) {
    if ("*".equals(origin)) {
      throw new IllegalArgumentException("CORS wildcard origins are not permitted");
    }
  }
}
