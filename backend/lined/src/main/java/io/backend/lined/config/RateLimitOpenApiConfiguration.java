package io.backend.lined.config;

import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.Paths;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.responses.ApiResponses;
import java.util.Set;
import org.springdoc.core.customizers.GlobalOpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Adds the shared admission-rejection contract to covered auth operations. */
@Configuration
public class RateLimitOpenApiConfiguration {

  private static final Set<String> COVERED_PATHS = Set.of(
      "/api/users", "/api/auth/login", "/api/auth/refresh", "/api/auth/logout",
      "/api/auth/csrf", "/api/auth/password-reset-requests", "/api/auth/password-resets");

  /** Supplies the OpenAPI customizer for covered admission-controlled routes.
   *
   * @return customizer adding 429 and 503 responses
   */
  @Bean
  public GlobalOpenApiCustomizer rateLimitResponses() {
    return openApi -> addResponses(openApi.getPaths());
  }

  private void addResponses(Paths paths) {
    if (paths == null) {
      return;
    }
    paths.forEach((path, item) -> {
      if (COVERED_PATHS.contains(path)) {
        item.readOperationsMap().values().forEach(this::addResponses);
      }
    });
  }

  /** Adds the shared 429 and 503 responses to one OpenAPI operation. */
  private void addResponses(Operation operation) {
    ApiResponses responses = operation.getResponses();
    if (responses == null) {
      responses = new ApiResponses();
      operation.setResponses(responses);
    }
    responses.addApiResponse("429", new ApiResponse()
        .description("Rate limit exceeded; retry after the integer Retry-After seconds."));
    responses.addApiResponse("503", new ApiResponse()
        .description("Rate limiter unavailable; retry later without exposing internal state."));
  }
}
