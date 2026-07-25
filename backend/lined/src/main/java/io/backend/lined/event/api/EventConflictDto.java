package io.backend.lined.event.api;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;

/**
 * A privacy-safe pair of overlapping events.
 *
 * <p>For example, an owner receives their complete private event while another member receives a
 * deliberately sparse event payload with no title, location, or identifier. The overlap bounds
 * remain available for scheduling without disclosing private content.</p>
 */
@Schema(name = "EventConflictDto", description = "A privacy-safe pair of overlapping events")
public record EventConflictDto(
    @Schema(description = "First conflicting event, sanitized for the requester") EventConflictSideDto first,
    @Schema(description = "Second conflicting event, sanitized for the requester") EventConflictSideDto second,
    @Schema(description = "Overlap start") OffsetDateTime overlapStart,
    @Schema(description = "Overlap end") OffsetDateTime overlapEnd
) {
}
