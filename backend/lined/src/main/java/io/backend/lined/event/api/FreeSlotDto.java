package io.backend.lined.event.api;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;

@Schema(name = "FreeSlotDto", description = "A time window where every lobby member is available")
public record FreeSlotDto(
    @Schema(description = "Inclusive free-slot start") OffsetDateTime start,
    @Schema(description = "Exclusive free-slot end") OffsetDateTime end
) {
}
