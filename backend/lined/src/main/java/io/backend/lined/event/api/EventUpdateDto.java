package io.backend.lined.event.api;

import io.backend.lined.event.domain.EventVisibility;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;

/**
 * Partial event update payload, including an optional replacement reminder lead time.
 *
 * <p>For example, sending {@code reminderMinutesBefore: 60} updates a prior 30-minute policy;
 * null keeps the existing setting because this is a PATCH payload.</p>
 */
@Schema(name = "EventUpdateDto")
public record EventUpdateDto(
    @Schema(example = "Lunch together") String title,
    @Schema(example = "Whole Foods Market") @Size(max = 255) String location,
    @Schema(example = "false") Boolean shared,
    @Schema(example = "PRIVATE") EventVisibility visibility,
    @Schema(example = "2025-11-20T18:00:00Z") OffsetDateTime startAt,
    @Schema(example = "2025-11-20T20:00:00Z") OffsetDateTime endAt,
    @Schema(example = "Europe/Kyiv") String timezone,
    @Schema(example = "45", description = "0 disables; omitted or null leaves the current value")
    @Min(0) @Max(10080) Integer reminderMinutesBefore
) {

  /**
   * Retains the previous partial-update call shape.
   *
   * <p>For example, {@code new EventUpdateDto(null, "Park", null, null, null, null)} updates
   * only a location and leaves the reminder configuration unchanged.</p>
   */
  public EventUpdateDto(String title, String location, Boolean shared, OffsetDateTime startAt,
                        OffsetDateTime endAt, String timezone) {
    this(title, location, shared, null, startAt, endAt, timezone, null);
  }

  /** Retains the pre-visibility constructor used by existing Java callers. */
  public EventUpdateDto(String title, String location, Boolean shared, OffsetDateTime startAt,
                        OffsetDateTime endAt, String timezone, Integer reminderMinutesBefore) {
    this(title, location, shared, null, startAt, endAt, timezone, reminderMinutesBefore);
  }
}
