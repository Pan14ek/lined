package io.backend.lined.config;

import static org.assertj.core.api.Assertions.assertThat;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.PathItem;
import io.swagger.v3.oas.models.Paths;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.responses.ApiResponses;
import org.junit.jupiter.api.Test;
import org.springdoc.core.customizers.GlobalOpenApiCustomizer;

class RateLimitOpenApiConfigurationTest {

  @Test
  void customizerLeavesOpenApiWithoutPathsUnchanged() {
    GlobalOpenApiCustomizer customizer = new RateLimitOpenApiConfiguration().rateLimitResponses();
    OpenAPI openApi = new OpenAPI();

    customizer.customise(openApi);

    assertThat(openApi.getPaths()).isNull();
  }

  @Test
  void customizerAddsResponsesOnlyToCoveredOperations() {
    Operation postUsers = new Operation();
    Operation getUsers = new Operation().responses(new ApiResponses()
        .addApiResponse("200", new ApiResponse().description("ok")));
    Operation health = new Operation();
    Paths paths = new Paths()
        .addPathItem("/api/users", new PathItem().post(postUsers).get(getUsers))
        .addPathItem("/health", new PathItem().get(health));
    GlobalOpenApiCustomizer customizer = new RateLimitOpenApiConfiguration().rateLimitResponses();

    customizer.customise(new OpenAPI().paths(paths));

    assertThat(postUsers.getResponses()).containsKeys("429", "503");
    assertThat(getUsers.getResponses()).containsKeys("200", "429", "503");
    assertThat(health.getResponses()).isNull();
  }
}
