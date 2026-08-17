package io.backend.lined.featureflag.api;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.Map;

/**
 * Public, allowlisted feature availability returned to Lined clients.
 *
 * @param flags enabled state keyed only by approved stable public flag names
 */
@Schema(name = "FeatureFlagsDto", description = "Public feature availability for the active environment")
public record FeatureFlagsDto(
    @Schema(description = "Approved feature-flag keys and their current enabled state")
    Map<String, Boolean> flags
) {

  public FeatureFlagsDto {
    flags = Map.copyOf(flags);
  }
}
