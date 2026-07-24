package io.backend.lined.event.api;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;

/**
 * Event response payload exposing the stored reminder override.
 *
 * <p>For example, a {@code null reminderMinutesBefore} tells a client that the server uses the
 * 30-minute default, while {@code 0} means no reminder will be scheduled for that event.</p>
 */
@Schema(name = "EventDto")
public record EventDto(
    @Schema(example = "9001") Long id,
    @Schema(example = "0", description = "Optimistic-lock version") long version,
    @Schema(example = "Dinner together") String title,
    @Schema(example = "Whole Foods Market") String location,
    @Schema(example = "true") boolean shared,
    @Schema(example = "2025-11-20T17:00:00Z") OffsetDateTime startAt,
    @Schema(example = "2025-11-20T19:00:00Z") OffsetDateTime endAt,
    @Schema(example = "Europe/Kyiv") String timezone,
    @Schema(example = "30", description = "Null means the 30-minute default")
    Integer reminderMinutesBefore,
    @Schema(example = "101") Long lobbyId,
    @Schema(example = "42") Long ownerId,
    @Schema(example = "2025-11-13T10:00:00Z") OffsetDateTime createdAt
) {

}
