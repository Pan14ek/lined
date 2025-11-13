package io.backend.lined.event.api;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;

@Schema(name = "EventCreateDto")
public record EventCreateDto(
    @Schema(example = "Dinner together") @NotBlank String title,
    @Schema(example = "true") boolean shared,
    @Schema(example = "2025-11-20T17:00:00Z") @NotNull OffsetDateTime startAt,
    @Schema(example = "2025-11-20T19:00:00Z") @NotNull OffsetDateTime endAt,
    @Schema(example = "Europe/Kyiv") @NotBlank String timezone,
    @Schema(example = "101") @NotNull Long lobbyId
) {
}
