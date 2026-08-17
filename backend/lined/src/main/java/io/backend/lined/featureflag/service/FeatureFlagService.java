package io.backend.lined.featureflag.service;

import java.util.Map;

/**
 * Reads cached feature-flag state and refreshes it from the active environment.
 */
public interface FeatureFlagService {

  boolean isEnabled(String key);

  Map<String, Boolean> publicFlags();

  boolean refresh();
}
