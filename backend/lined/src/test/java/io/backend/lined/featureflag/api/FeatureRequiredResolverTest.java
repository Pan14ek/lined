package io.backend.lined.featureflag.api;

import static org.assertj.core.api.Assertions.assertThat;

import io.backend.lined.featureflag.domain.FeatureFlagKey;
import org.junit.jupiter.api.Test;
import org.springframework.web.method.HandlerMethod;

class FeatureRequiredResolverTest {

  private final FeatureRequiredResolver resolver = new FeatureRequiredResolver();

  @Test
  void resolve_returnsMethodRequirement_whenMethodOverridesController() throws Exception {
    HandlerMethod handler = handlerMethod("overridden");

    assertThat(resolver.resolve(handler)).contains(FeatureFlagKey.CALENDARS);
  }

  @Test
  void resolve_returnsControllerRequirement_whenMethodIsNotAnnotated() throws Exception {
    HandlerMethod handler = handlerMethod("inherited");

    assertThat(resolver.resolve(handler)).contains(FeatureFlagKey.TASKS);
  }

  @Test
  void resolve_returnsEmpty_whenHandlerHasNoFeatureRequirement() throws Exception {
    HandlerMethod handler = new HandlerMethod(new OpenController(),
        OpenController.class.getMethod("open"));

    assertThat(resolver.resolve(handler)).isEmpty();
  }

  private HandlerMethod handlerMethod(String methodName) throws Exception {
    return new HandlerMethod(new FeatureController(), FeatureController.class.getMethod(methodName));
  }

  @FeatureRequired(FeatureFlagKey.TASKS)
  private static class FeatureController {

    @FeatureRequired(FeatureFlagKey.CALENDARS)
    public void overridden() {
      // Handler metadata fixture.
    }

    public void inherited() {
      // Handler metadata fixture.
    }
  }

  private static class OpenController {

    public void open() {
      // Handler metadata fixture.
    }
  }
}
