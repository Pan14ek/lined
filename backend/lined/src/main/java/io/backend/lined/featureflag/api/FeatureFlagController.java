package io.backend.lined.featureflag.api;

import io.backend.lined.featureflag.service.FeatureFlagService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public cache-backed discovery endpoint for client feature availability.
 *
 * <p>For example, an unauthenticated web client can request {@code /api/features} before
 * rendering Calendar navigation without the endpoint querying PostgreSQL.</p>
 */
@RestController
@RequestMapping("/api/features")
@RequiredArgsConstructor
@Tag(name = "Features", description = "Public feature availability")
public class FeatureFlagController {

  private final FeatureFlagService featureFlagService;

  /**
   * Returns exactly the approved public catalog from the local immutable cache.
   *
   * @return public feature availability without administration metadata
   */
  @GetMapping
  @Operation(summary = "Get public feature availability",
      description = "Unauthenticated cache-backed discovery of the seven approved feature flags.",
      responses = @ApiResponse(responseCode = "200", description = "Feature availability returned"))
  public FeatureFlagsDto features() {
    return new FeatureFlagsDto(featureFlagService.publicFlags());
  }
}
