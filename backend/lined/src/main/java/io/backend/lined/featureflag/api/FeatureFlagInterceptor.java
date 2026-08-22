package io.backend.lined.featureflag.api;

import io.backend.lined.common.exception.FeatureDisabledException;
import io.backend.lined.featureflag.domain.FeatureFlagKey;
import io.backend.lined.featureflag.service.FeatureFlagService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Stops disabled feature requests before their selected MVC controller method executes.
 */
@Component
@RequiredArgsConstructor
public class FeatureFlagInterceptor implements HandlerInterceptor {

  private final FeatureFlagService featureFlagService;
  private final FeatureRequiredResolver featureRequiredResolver;
  private final FeatureFlagBlockedRequestLogger blockedRequestLogger;

  @Override
  public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
    if (!(handler instanceof HandlerMethod handlerMethod)) {
      return true;
    }
    return featureRequiredResolver.resolve(handlerMethod)
        .map(this::allowWhenEnabled)
        .orElse(true);
  }

  private boolean allowWhenEnabled(FeatureFlagKey key) {
    if (featureFlagService.isEnabled(key.value())) {
      return true;
    }
    blockedRequestLogger.logBlocked(key);
    throw new FeatureDisabledException(key);
  }
}
