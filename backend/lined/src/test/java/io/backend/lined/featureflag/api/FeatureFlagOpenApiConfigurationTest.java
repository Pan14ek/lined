package io.backend.lined.featureflag.api;

import static org.assertj.core.api.Assertions.assertThat;

import io.backend.lined.featureflag.domain.FeatureFlagKey;
import io.swagger.v3.oas.models.Operation;
import org.junit.jupiter.api.Test;
import org.springframework.web.method.HandlerMethod;

class FeatureFlagOpenApiConfigurationTest {

  private static final String FEATURE_DISABLED_RESPONSE_STATUS = "503";
  private static final String FEATURE_DISABLED_RESPONSE_DESCRIPTION =
      "This feature is currently unavailable";
  private static final String PROBLEM_JSON_MEDIA_TYPE = "application/problem+json";

  private final FeatureFlagOpenApiConfiguration configuration =
      new FeatureFlagOpenApiConfiguration(new FeatureRequiredResolver());

  @Test
  void featureDisabledResponseCustomizer_documentsProtectedOperation() throws Exception {
    Operation operation = new Operation();

    Operation documented = configuration.featureDisabledResponseCustomizer().customize(operation,
        handler(ProtectedController.class, "protectedHandler"));

    assertThat(documented.getResponses()).containsKey(FEATURE_DISABLED_RESPONSE_STATUS);
    assertThat(documented.getResponses().get(FEATURE_DISABLED_RESPONSE_STATUS).getDescription())
        .isEqualTo(FEATURE_DISABLED_RESPONSE_DESCRIPTION);
    assertThat(documented.getResponses().get(FEATURE_DISABLED_RESPONSE_STATUS).getContent())
        .containsKey(PROBLEM_JSON_MEDIA_TYPE);
    assertThat(documented.getResponses().get(FEATURE_DISABLED_RESPONSE_STATUS).getContent()
        .get(PROBLEM_JSON_MEDIA_TYPE).getSchema().getProperties())
        .containsKeys("type", "title", "status", "detail", "code", "feature");
  }

  @Test
  void featureDisabledResponseCustomizer_leavesOpenOperationUnchanged() throws Exception {
    Operation operation = new Operation();

    Operation documented = configuration.featureDisabledResponseCustomizer().customize(operation,
        handler(OpenController.class, "openHandler"));

    assertThat(documented.getResponses()).isNull();
  }

  private HandlerMethod handler(Class<?> controllerType, String methodName) throws Exception {
    return new HandlerMethod(controllerType.getDeclaredConstructor().newInstance(),
        controllerType.getMethod(methodName));
  }

  @FeatureRequired(FeatureFlagKey.TASKS)
  public static class ProtectedController {

    public void protectedHandler() {
      // Handler fixture.
    }
  }

  public static class OpenController {

    public void openHandler() {
      // Handler fixture.
    }
  }
}
