package io.backend.lined.featureflag.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.backend.lined.common.exception.FeatureDisabledException;
import io.backend.lined.featureflag.domain.FeatureFlagKey;
import io.backend.lined.featureflag.service.FeatureFlagService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.method.HandlerMethod;

@ExtendWith(MockitoExtension.class)
class FeatureFlagInterceptorTest {

  @Mock
  private FeatureFlagService featureFlagService;
  @Mock
  private FeatureFlagBlockedRequestLogger blockedRequestLogger;

  private FeatureFlagInterceptor interceptor;

  @BeforeEach
  void setUp() {
    interceptor = new FeatureFlagInterceptor(featureFlagService, new FeatureRequiredResolver(),
        blockedRequestLogger);
  }

  @Test
  void preHandle_allowsNonHandlerMethod() {
    boolean allowed = interceptor.preHandle(request(), response(), new Object());

    assertThat(allowed).isTrue();
  }

  @Test
  void preHandle_allowsUnannotatedHandler() {
    boolean allowed = interceptor.preHandle(request(), response(), handler(OpenController.class, "open"));

    assertThat(allowed).isTrue();
  }

  @Test
  void preHandle_allowsEnabledClassRequirement() {
    when(featureFlagService.isEnabled(FeatureFlagKey.TASKS.value())).thenReturn(true);

    boolean allowed = interceptor.preHandle(request(), response(),
        handler(ClassProtectedController.class, "protectedByClass"));

    assertThat(allowed).isTrue();
    verify(featureFlagService).isEnabled(FeatureFlagKey.TASKS.value());
  }

  @Test
  void preHandle_throwsFeatureDisabledException_whenClassRequirementIsDisabled() {
    when(featureFlagService.isEnabled(FeatureFlagKey.TASKS.value())).thenReturn(false);
    MockHttpServletRequest request = request();
    MockHttpServletResponse response = response();
    HandlerMethod handler = handler(ClassProtectedController.class, "protectedByClass");

    assertThatThrownBy(() -> interceptor.preHandle(request, response, handler))
        .isInstanceOf(FeatureDisabledException.class)
        .hasFieldOrPropertyWithValue("feature", FeatureFlagKey.TASKS.value());

    verify(blockedRequestLogger).logBlocked(FeatureFlagKey.TASKS);
  }

  @Test
  void preHandle_usesMethodRequirementBeforeClassRequirement() {
    when(featureFlagService.isEnabled(FeatureFlagKey.CALENDARS.value())).thenReturn(false);
    MockHttpServletRequest request = request();
    MockHttpServletResponse response = response();
    HandlerMethod handler = handler(ClassProtectedController.class, "overridden");

    assertThatThrownBy(() -> interceptor.preHandle(request, response, handler))
        .isInstanceOf(FeatureDisabledException.class)
        .hasFieldOrPropertyWithValue("feature", FeatureFlagKey.CALENDARS.value());

    verify(featureFlagService).isEnabled(FeatureFlagKey.CALENDARS.value());
    verify(featureFlagService, never()).isEnabled(FeatureFlagKey.TASKS.value());
  }

  private MockHttpServletRequest request() {
    return new MockHttpServletRequest();
  }

  private MockHttpServletResponse response() {
    return new MockHttpServletResponse();
  }

  private HandlerMethod handler(Class<?> controllerType, String methodName) {
    try {
      return new HandlerMethod(controllerType.getDeclaredConstructor().newInstance(),
          controllerType.getMethod(methodName));
    } catch (ReflectiveOperationException exception) {
      throw new IllegalArgumentException("Invalid handler fixture", exception);
    }
  }

  @FeatureRequired(FeatureFlagKey.TASKS)
  public static class ClassProtectedController {

    public void protectedByClass() {
      // Handler fixture.
    }

    @FeatureRequired(FeatureFlagKey.CALENDARS)
    public void overridden() {
      // Handler fixture.
    }
  }

  public static class OpenController {

    public void open() {
      // Handler fixture.
    }
  }
}
