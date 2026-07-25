package io.backend.lined.event.api;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * One event side in a privacy-safe calendar conflict response.
 *
 * <p>For example, the owner of a private appointment receives its identifier and complete
 * {@link EventDto}; another lobby member receives {@code ownerId}, {@code shared=false}, and
 * {@code detailsAvailable=false}. The null fields are intentional redaction, not an incomplete
 * event, and therefore must never be treated as a retryable client-loading failure.</p>
 *
 * @param eventId event identifier when details are available; otherwise null
 * @param ownerId event owner identifier
 * @param shared legacy visibility value during the boolean compatibility period
 * @param detailsAvailable whether {@code event} contains safe details
 * @param event complete event only when details are available
 */
@Schema(name = "EventConflictSideDto", description = "A privacy-sanitized conflicting event")
public record EventConflictSideDto(
    @Schema(description = "Event identifier when details are available", example = "9001") Long eventId,
    @Schema(description = "Owning user identifier", example = "42") Long ownerId,
    @Schema(description = "Whether the event is shared", example = "false") boolean shared,
    @Schema(description = "Whether the full event payload is safe to render", example = "false")
    boolean detailsAvailable,
    @Schema(description = "Full event only when details are available") EventDto event
) {
}
