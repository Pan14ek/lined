package io.backend.lined.featureflag.domain;

/**
 * Deployment environments with independently persisted feature-flag values.
 */
public enum FeatureFlagEnvironment {
  LOCAL,
  TEST,
  STAGING,
  PRODUCTION
}
