package io.backend.lined.event.api;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;

@Schema(name = "EventUpdateDto")
public record EventUpdateDto(
    @Schema(example = "Lunch together") String title,
    @Schema(example = "false") Boolean shared,
    @Schema(example = "2025-11-20T18:00:00Z") OffsetDateTime startAt,
    @Schema(example = "2025-11-20T20:00:00Z") OffsetDateTime endAt,
    @Schema(example = "Europe/Kyiv") String timezone
) {
}
