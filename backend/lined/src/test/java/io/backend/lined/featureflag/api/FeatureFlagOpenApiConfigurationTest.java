package io.backend.lined.featureflag.api;

import static org.assertj.core.api.Assertions.assertThat;

import io.swagger.v3.oas.models.Operation;
import org.junit.jupiter.api.Test;
import org.springframework.web.method.HandlerMethod;

class FeatureFlagOpenApiConfigurationTest {

  private final FeatureFlagOpenApiConfiguration configuration =
      new FeatureFlagOpenApiConfiguration(new FeatureRequiredResolver());

  @Test
  void featureDisabledResponseCustomizer_documentsProtectedOperation() throws Exception {
    Operation operation = new Operation();

    Operation documented = configuration.featureDisabledResponseCustomizer().customize(operation,
        handler(ProtectedController.class, "protectedHandler"));

    assertThat(documented.getResponses()).containsKey("503");
    assertThat(documented.getResponses().get("503").getDescription())
        .isEqualTo("This feature is currently unavailable");
    assertThat(documented.getResponses().get("503").getContent())
        .containsKey("application/problem+json");
    assertThat(documented.getResponses().get("503").getContent()
        .get("application/problem+json").getSchema().getProperties())
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

  @FeatureRequired(io.backend.lined.featureflag.domain.FeatureFlagKey.TASKS)
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
