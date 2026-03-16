package io.backend.lined.event.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;

@Schema(name = "EventConflictDto", description = "A pair of overlapping events")
public record EventConflictDto(
    @Schema(description = "First conflicting event") EventDto first,
    @Schema(description = "Second conflicting event") EventDto second,
    @Schema(description = "Overlap start") OffsetDateTime overlapStart,
    @Schema(description = "Overlap end") OffsetDateTime overlapEnd
) {}
