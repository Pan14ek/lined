package io.backend.lined.event.api;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(name = "UserConflictDto", description = "Whether a user has a conflicting event in a time window")
public record UserConflictDto(
    @Schema(description = "User id") Long userId,
    @Schema(description = "Whether a conflict exists") boolean hasConflict,
    @Schema(description = "The conflicting event if any") EventDto conflictingEvent
) {}
