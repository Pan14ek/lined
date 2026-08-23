package io.backend.lined.featureflag.api;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Registers capability enforcement only for public application API routes.
 */
@Configuration
@RequiredArgsConstructor
public class FeatureFlagWebMvcConfiguration implements WebMvcConfigurer {

  private final FeatureFlagInterceptor featureFlagInterceptor;

  /**
   * Adds the feature interceptor to public API routes while preserving stable control-plane and
   * operational endpoints that must remain available for recovery and discovery.
   *
   * @param registry Spring MVC interceptor registry
   */
  @Override
  public void addInterceptors(InterceptorRegistry registry) {
    registry.addInterceptor(featureFlagInterceptor)
        .addPathPatterns("/api/**")
        .excludePathPatterns("/api/auth/**", "/api/features", "/api/admin/feature-flags/**",
            "/actuator/**", "/swagger-ui/**", "/v3/api-docs/**", "/webjars/**");
  }
}
