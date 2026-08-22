package io.backend.lined.featureflag.api;

import io.backend.lined.featureflag.domain.FeatureFlagKey;
import java.util.Optional;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;

/**
 * Resolves the effective feature requirement for a Spring MVC handler.
 */
@Component
public class FeatureRequiredResolver {

  /**
   * Resolves method metadata before falling back to controller metadata.
   *
   * @param handlerMethod selected Spring MVC handler
   * @return required capability when the handler is feature-gated
   */
  public Optional<FeatureFlagKey> resolve(HandlerMethod handlerMethod) {
    FeatureRequired methodRequirement = AnnotatedElementUtils.findMergedAnnotation(
        handlerMethod.getMethod(), FeatureRequired.class);
    if (methodRequirement != null) {
      return Optional.of(methodRequirement.value());
    }
    FeatureRequired classRequirement = AnnotatedElementUtils.findMergedAnnotation(
        handlerMethod.getBeanType(), FeatureRequired.class);
    return classRequirement == null ? Optional.empty() : Optional.of(classRequirement.value());
  }
}
