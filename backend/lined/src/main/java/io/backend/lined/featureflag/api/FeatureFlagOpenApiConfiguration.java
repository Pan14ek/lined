package io.backend.lined.featureflag.api;

import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.MediaType;
import io.swagger.v3.oas.models.media.ObjectSchema;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.media.StringSchema;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.responses.ApiResponses;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.customizers.GlobalOperationCustomizer;
import org.springframework.http.HttpStatus;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Documents the common disabled-feature response on every protected operation.
 */
@Configuration
@RequiredArgsConstructor
public class FeatureFlagOpenApiConfiguration {

  private static final String FEATURE_DISABLED_RESPONSE = "This feature is currently unavailable";
  private static final String PROBLEM_MEDIA_TYPE = "application/problem+json";

  private final FeatureRequiredResolver featureRequiredResolver;

  @Bean
  public GlobalOperationCustomizer featureDisabledResponseCustomizer() {
    return this::documentFeatureDisabledResponse;
  }

  private Operation documentFeatureDisabledResponse(
      Operation operation, org.springframework.web.method.HandlerMethod handlerMethod) {
    if (featureRequiredResolver.resolve(handlerMethod).isPresent()) {
      responsesOf(operation).putIfAbsent("503", featureDisabledResponse());
    }
    return operation;
  }

  private ApiResponse featureDisabledResponse() {
    return new ApiResponse()
        .description(FEATURE_DISABLED_RESPONSE)
        .content(new Content().addMediaType(PROBLEM_MEDIA_TYPE,
            new MediaType().schema(featureDisabledSchema())));
  }

  private Schema<?> featureDisabledSchema() {
    return new ObjectSchema()
        .addProperty("type", new StringSchema().example("https://errors.lined.app/feature.disabled"))
        .addProperty("title", new StringSchema().example(HttpStatus.SERVICE_UNAVAILABLE.getReasonPhrase()))
        .addProperty("status", new Schema<Integer>().example(HttpStatus.SERVICE_UNAVAILABLE.value()))
        .addProperty("detail", new StringSchema().example(FEATURE_DISABLED_RESPONSE))
        .addProperty("code", new StringSchema().example("feature.disabled"))
        .addProperty("feature", new StringSchema().example("calendars.feature.enabled"));
  }

  private ApiResponses responsesOf(Operation operation) {
    if (operation.getResponses() == null) {
      operation.setResponses(new ApiResponses());
    }
    return operation.getResponses();
  }
}
