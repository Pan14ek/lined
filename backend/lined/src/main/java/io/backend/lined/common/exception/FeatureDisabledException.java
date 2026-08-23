package io.backend.lined.common.exception;

import io.backend.lined.featureflag.domain.FeatureFlagKey;
import org.springframework.http.HttpStatus;

/**
 * Signals that an otherwise valid public capability is temporarily unavailable.
 */
public class FeatureDisabledException extends BaseAppException {

  private final String feature;

  public FeatureDisabledException(FeatureFlagKey key) {
    super(HttpStatus.SERVICE_UNAVAILABLE, "feature.disabled", "This feature is currently unavailable");
    feature = key.value();
  }

  public String getFeature() {
    return feature;
  }
}
