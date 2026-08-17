package io.backend.lined.featureflag.service;

import io.backend.lined.featureflag.domain.FeatureFlagKey;
import io.backend.lined.featureflag.domain.FeatureFlagRepository;
import jakarta.transaction.Transactional;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Loads the active environment's persisted flags into the request-time cache.
 *
 * <p>For example, a repository timeout leaves a previously loaded map untouched, so Calendar is
 * not accidentally disabled merely because a recovery refresh failed.</p>
 */
@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class FeatureFlagServiceImpl implements FeatureFlagService {

  private final FeatureFlagRepository repository;
  private final FeatureFlagProperties properties;
  private final FeatureFlagSnapshot snapshot;

  @Override
  public boolean isEnabled(String key) {
    return snapshot.isEnabled(key);
  }

  @Override
  public Map<String, Boolean> publicFlags() {
    Map<String, Boolean> publicFlags = new LinkedHashMap<>();
    for (FeatureFlagKey key : FeatureFlagKey.values()) {
      publicFlags.put(key.value(), snapshot.isEnabled(key.value()));
    }
    return Collections.unmodifiableMap(new LinkedHashMap<>(publicFlags));
  }

  @Override
  public boolean refresh() {
    try {
      snapshot.replaceAll(repository.findAllByEnvironment(properties.environment()).stream()
          .collect(java.util.stream.Collectors.toMap(
              flag -> flag.getKey(), flag -> flag.isEnabled())));
      return true;
    } catch (RuntimeException exception) {
      log.error("Feature-flag refresh failed for environment {}", properties.environment(), exception);
      return false;
    }
  }
}
