package io.backend.lined.auth.service;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/** Validated server-side lifetimes for opaque refresh sessions. */
@ConfigurationProperties("lined.security.session")
public record RefreshSessionProperties(
    @DefaultValue("PT168H") Duration refreshIdleTimeout,
    @DefaultValue("PT720H") Duration absoluteTimeout
) {

  public RefreshSessionProperties {
    requirePositive(refreshIdleTimeout, "Refresh idle timeout must be positive");
    requirePositive(absoluteTimeout, "Refresh absolute timeout must be positive");
    if (refreshIdleTimeout.compareTo(absoluteTimeout) > 0) {
      throw new IllegalArgumentException("Refresh idle timeout must not exceed absolute timeout");
    }
  }

  private static void requirePositive(Duration value, String message) {
    if (value == null || value.isZero() || value.isNegative()) {
      throw new IllegalArgumentException(message);
    }
  }
}
