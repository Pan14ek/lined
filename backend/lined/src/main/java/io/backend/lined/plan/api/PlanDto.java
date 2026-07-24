package io.backend.lined.plan.api;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;

public record PlanDto(
    @Schema(example = "1")
    long id,

    @Schema(example = "0", description = "Optimistic-lock version")
    long version,

    @Schema(example = "FREE", description = "Temporary legacy plan identifier")
    String name,

    @Schema(example = "2025-01-01T10:15:30Z")
    OffsetDateTime createdAt
) {
  public PlanDto(long id, String name, OffsetDateTime createdAt) {
    this(id, 0L, name, createdAt);
  }
}
