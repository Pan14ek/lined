package io.backend.lined.featureflag.service;

import io.backend.lined.featureflag.domain.FeatureFlagEnvironment;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Active feature-flag environment and refresh cadence shared with synchronization work.
 *
 * <p>For example, {@code FEATURE_FLAG_ENVIRONMENT=staging} loads only staging rows while the
 * later multi-instance synchronization task uses {@code refreshDelay} for recovery refreshes.</p>
 */
@ConfigurationProperties("lined.feature-flags")
public record FeatureFlagProperties(
    @DefaultValue("LOCAL") FeatureFlagEnvironment environment,
    @DefaultValue("PT30M") Duration refreshDelay
) {
}
