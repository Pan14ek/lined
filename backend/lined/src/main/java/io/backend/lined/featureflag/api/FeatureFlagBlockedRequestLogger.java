package io.backend.lined.featureflag.api;

import io.backend.lined.featureflag.domain.FeatureFlagKey;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Emits at most one disabled-request diagnostic for each known feature capability.
 */
@Component
@Slf4j
public class FeatureFlagBlockedRequestLogger {

  private final Set<FeatureFlagKey> loggedKeys = ConcurrentHashMap.newKeySet();

  /**
   * Logs the first blocked request for a capability without recording request-specific data.
   *
   * @param key known disabled capability
   */
  public void logBlocked(FeatureFlagKey key) {
    if (loggedKeys.add(key)) {
      log.warn("Feature request blocked; feature={}", key.value());
    }
  }

  boolean hasLogged(FeatureFlagKey key) {
    return loggedKeys.contains(key);
  }
}
