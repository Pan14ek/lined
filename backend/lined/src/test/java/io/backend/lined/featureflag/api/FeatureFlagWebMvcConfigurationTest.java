package io.backend.lined.featureflag.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.servlet.config.annotation.InterceptorRegistration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;

class FeatureFlagWebMvcConfigurationTest {

  @Test
  void addInterceptors_registersApiBoundaryWithExpectedExclusions() {
    FeatureFlagInterceptor interceptor = mock(FeatureFlagInterceptor.class);
    InterceptorRegistry registry = new InterceptorRegistry();

    new FeatureFlagWebMvcConfiguration(interceptor).addInterceptors(registry);

    InterceptorRegistration registration = onlyRegistration(registry);

    assertThat(ReflectionTestUtils.getField(registration, "interceptor")).isSameAs(interceptor);
    assertThat(patternsOf(registration, "includePatterns")).containsExactly("/api/**");
    assertThat(patternsOf(registration, "excludePatterns"))
        .containsExactly("/api/auth/**", "/api/features", "/api/admin/feature-flags/**",
            "/actuator/**", "/swagger-ui/**", "/v3/api-docs/**", "/webjars/**");
  }

  private InterceptorRegistration onlyRegistration(InterceptorRegistry registry) {
    @SuppressWarnings("unchecked")
    List<InterceptorRegistration> registrations =
        (List<InterceptorRegistration>) ReflectionTestUtils.getField(registry, "registrations");
    assertThat(registrations).hasSize(1);
    return registrations.get(0);
  }

  @SuppressWarnings("unchecked")
  private List<String> patternsOf(InterceptorRegistration registration, String fieldName) {
    return (List<String>) ReflectionTestUtils.getField(registration, fieldName);
  }
}
