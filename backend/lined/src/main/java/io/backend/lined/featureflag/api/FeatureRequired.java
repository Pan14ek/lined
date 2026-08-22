package io.backend.lined.featureflag.api;

import io.backend.lined.featureflag.domain.FeatureFlagKey;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Declares the public capability required before a Spring MVC handler may execute.
 */
@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
public @interface FeatureRequired {

  FeatureFlagKey value();
}
