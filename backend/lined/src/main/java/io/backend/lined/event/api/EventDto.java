package io.backend.lined.event.api;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;

@Schema(name = "EventDto")
public record EventDto(
    @Schema(example = "9001") Long id,
    @Schema(example = "Dinner together") String title,
    @Schema(example = "true") boolean shared,
    @Schema(example = "2025-11-20T17:00:00Z") OffsetDateTime startAt,
    @Schema(example = "2025-11-20T19:00:00Z") OffsetDateTime endAt,
    @Schema(example = "Europe/Kyiv") String timezone,
    @Schema(example = "101") Long lobbyId,
    @Schema(example = "42") Long ownerId,
    @Schema(example = "2025-11-13T10:00:00Z") OffsetDateTime createdAt
) {
}
