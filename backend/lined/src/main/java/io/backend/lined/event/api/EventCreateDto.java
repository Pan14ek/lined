package io.backend.lined.event.api;

import io.backend.lined.event.domain.EventVisibility;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;

/**
 * Client payload for creating an event with an optional reminder lead time.
 *
 * <p>For example, {@code reminderMinutesBefore: 45} requests an alert 45 minutes before an
 * event, omission uses 30 minutes, and {@code 0} records an explicit opt-out.</p>
 */
@Schema(name = "EventCreateDto")
public record EventCreateDto(
    @Schema(example = "Dinner together") @NotBlank String title,
    @Schema(example = "Whole Foods Market") @Size(max = 255) String location,
    @Schema(example = "true", deprecated = true) Boolean shared,
    @Schema(example = "SHARED") EventVisibility visibility,
    @Schema(example = "2025-11-20T17:00:00Z") @NotNull OffsetDateTime startAt,
    @Schema(example = "2025-11-20T19:00:00Z") @NotNull OffsetDateTime endAt,
    @Schema(example = "Europe/Kyiv") @NotBlank String timezone,
    @Schema(example = "30", description = "Null uses the 30-minute default; 0 disables reminders")
    @Min(0) @Max(10080) Integer reminderMinutesBefore,
    @Schema(example = "101") @NotNull Long lobbyId,
    @Schema(example = "true") boolean notifyMembers
) {

  public EventCreateDto(String title, String location, boolean shared, OffsetDateTime startAt,
                        OffsetDateTime endAt, String timezone, Long lobbyId) {
    this(title, location, shared, null, startAt, endAt, timezone, null, lobbyId, false);
  }

  /** Retains the pre-visibility constructor used by existing Java callers. */
  public EventCreateDto(String title, String location, boolean shared, OffsetDateTime startAt,
                        OffsetDateTime endAt, String timezone, Integer reminderMinutesBefore,
                        Long lobbyId, boolean notifyMembers) {
    this(title, location, shared, null, startAt, endAt, timezone, reminderMinutesBefore, lobbyId,
        notifyMembers);
  }

}
