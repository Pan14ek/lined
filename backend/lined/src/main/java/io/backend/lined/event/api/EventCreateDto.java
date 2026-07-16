package io.backend.lined.event.api;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;

@Schema(name = "EventCreateDto")
public record EventCreateDto(
    @Schema(example = "Dinner together") @NotBlank String title,
    @Schema(example = "Whole Foods Market") @Size(max = 255) String location,
    @Schema(example = "true") boolean shared,
    @Schema(example = "2025-11-20T17:00:00Z") @NotNull OffsetDateTime startAt,
    @Schema(example = "2025-11-20T19:00:00Z") @NotNull OffsetDateTime endAt,
    @Schema(example = "Europe/Kyiv") @NotBlank String timezone,
    @Schema(example = "101") @NotNull Long lobbyId,
    @Schema(example = "true") boolean notifyMembers
) {

  public EventCreateDto(String title, String location, boolean shared, OffsetDateTime startAt,
                        OffsetDateTime endAt, String timezone, Long lobbyId) {
    this(title, location, shared, startAt, endAt, timezone, lobbyId, false);
  }
}
