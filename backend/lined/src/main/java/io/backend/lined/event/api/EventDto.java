package io.backend.lined.event.api;

import io.backend.lined.event.domain.EventVisibility;
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
    @Schema(example = "SHARED") EventVisibility visibility,
    @Schema(example = "2025-11-20T17:00:00Z") OffsetDateTime startAt,
    @Schema(example = "2025-11-20T19:00:00Z") OffsetDateTime endAt,
    @Schema(example = "Europe/Kyiv") String timezone,
    @Schema(example = "30", description = "Null means the 30-minute default")
    Integer reminderMinutesBefore,
    @Schema(example = "101") Long lobbyId,
    @Schema(example = "42") Long ownerId,
    @Schema(example = "2025-11-13T10:00:00Z") OffsetDateTime createdAt
) {

  private static final EventVisibility SHARED_VISIBILITY = EventVisibility.SHARED;
  private static final EventVisibility PRIVATE_VISIBILITY = EventVisibility.PRIVATE;

  /**
   * Retains the response constructor used before the enum was added.
   *
   * <p>For example, an old test constructing {@code shared=false} receives the equivalent
   * {@code visibility=PRIVATE}, keeping old Java callers source-compatible during Release A.</p>
   */
  public EventDto(Long id, long version, String title, String location, boolean shared,
                  OffsetDateTime startAt, OffsetDateTime endAt, String timezone,
                  Integer reminderMinutesBefore, Long lobbyId, Long ownerId,
                  OffsetDateTime createdAt) {
    this(id, version, title, location, shared, legacyVisibility(shared), startAt, endAt, timezone,
        reminderMinutesBefore, lobbyId, ownerId, createdAt);
  }

  private static EventVisibility legacyVisibility(boolean shared) {
    return shared ? SHARED_VISIBILITY : PRIVATE_VISIBILITY;
  }

}
