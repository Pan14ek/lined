package io.backend.lined.event.api;

import io.backend.lined.common.exception.ForbiddenException;
import io.backend.lined.common.VersionPrecondition;
import io.backend.lined.event.service.EventService;
import io.backend.lined.featureflag.api.FeatureRequired;
import io.backend.lined.featureflag.domain.FeatureFlagKey;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Calendar", description = "Calendar events")
@RestController
@RequestMapping("/api/calendar")
@RequiredArgsConstructor
@FeatureRequired(FeatureFlagKey.CALENDARS)
public class EventController {

  private final EventService service;

  @Operation(summary = "Create event", description = "Create personal/shared event in a lobby.")
  @PostMapping("/events")
  public ResponseEntity<EventDto> create(
      @Parameter(description = "Current user id (temporary for MVP)", example = "42")
      @RequestHeader("X-User-Id") Long currentUserId,
      @Parameter(description = "Optional retry key; same requester, key, and body replay one event")
      @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
      @io.swagger.v3.oas.annotations.parameters.RequestBody(
          required = true,
          content = @Content(schema = @Schema(implementation = EventCreateDto.class),
              examples = @ExampleObject(value = """
                    {
                      "title":"Dinner together",
                      "location":"Whole Foods Market",
                      "shared":true,
                      "startAt":"2025-11-20T17:00:00Z",
                      "endAt":"2025-11-20T19:00:00Z",
                      "timezone":"Europe/Kyiv",
                      "reminderMinutesBefore":30,
                      "lobbyId":101,
                      "notifyMembers":true
                    }
                  """)))
      @Valid @RequestBody EventCreateDto dto) {
    EventDto created = service.create(dto, currentUserId, idempotencyKey);
    return ResponseEntity.ok().eTag(VersionPrecondition.etag(created.version())).body(created);
  }

  @Deprecated
  public ResponseEntity<EventDto> create(Long currentUserId, EventCreateDto dto) {
    EventDto created = service.create(dto, currentUserId);
    return ResponseEntity.ok().eTag(VersionPrecondition.etag(created.version())).body(created);
  }

  @Operation(summary = "Update event",
      description = "Partial update: title/location/shared/startAt/endAt/timezone. "
          + "Blank location clears it; omitted location is unchanged. "
          + "reminderMinutesBefore accepts 0 through 10080; 0 disables reminders.")
  @PatchMapping("/events/{id}")
  public ResponseEntity<EventDto> update(
      @Parameter(example = "9001") @PathVariable Long id,
      @Parameter(description = "Current user id (temporary for MVP)", example = "42")
      @RequestHeader("X-User-Id") Long currentUserId,
      @RequestHeader(value = "If-Match", required = false) String ifMatch,
      @io.swagger.v3.oas.annotations.parameters.RequestBody(
          required = true,
          content = @Content(schema = @Schema(implementation = EventUpdateDto.class),
              examples = @ExampleObject(value = """
                    { "location":"Central Park", "startAt":"2025-11-20T18:00:00Z" }
                  """)))
      @Valid @RequestBody EventUpdateDto dto) {
    EventDto updated = service.update(id, dto, currentUserId, VersionPrecondition.parse(ifMatch));
    return ResponseEntity.ok().eTag(VersionPrecondition.etag(updated.version())).body(updated);
  }

  @Deprecated
  public EventDto update(Long id, Long currentUserId, EventUpdateDto dto) {
    return service.update(id, dto, currentUserId);
  }

  @Operation(summary = "List events", description = "List events overlapping a time window in lobby.")
  @GetMapping("/events")
  public List<EventDto> list(
      @Parameter(example = "101") @RequestParam Long lobbyId,
      @Parameter(example = "2025-11-20T00:00:00Z") @RequestParam OffsetDateTime from,
      @Parameter(example = "2025-11-21T00:00:00Z") @RequestParam OffsetDateTime to,
      @Parameter(description = "Current user id (temporary for MVP)", example = "42")
      @RequestHeader("X-User-Id") Long currentUserId) {
    return service.list(lobbyId, from, to, currentUserId);
  }

  /**
   * Reads one event through the server-side privacy boundary.
   *
   * <p>For example, a lobby member can open a shared event or their own private event. Requesting
   * another member's private ID returns the same {@code 404 Not Found} response as an unknown
   * ID, so the endpoint never confirms private-event existence.</p>
   *
   * @param id event identifier
   * @param currentUserId temporary MVP caller identity
   * @return visible event with its optimistic-lock ETag
   */
  @Operation(summary = "Get event", description = "Get a shared or caller-owned private event.")
  @GetMapping("/events/{id}")
  public ResponseEntity<EventDto> get(
      @Parameter(example = "9001") @PathVariable Long id,
      @Parameter(description = "Current user id (temporary for MVP)", example = "42")
      @RequestHeader("X-User-Id") Long currentUserId) {
    EventDto event = service.get(id, currentUserId);
    return ResponseEntity.ok().eTag(VersionPrecondition.etag(event.version())).body(event);
  }

  @Operation(summary = "Delete event", description = "Delete event (lobby owner/member).")
  @DeleteMapping("/events/{id}")
  public void delete(
      @Parameter(example = "9001") @PathVariable Long id,
      @Parameter(description = "Current user id (temporary for MVP)", example = "42")
      @RequestHeader("X-User-Id") Long currentUserId,
      @RequestHeader(value = "If-Match", required = false) String ifMatch) {
    service.delete(id, currentUserId, VersionPrecondition.parse(ifMatch));
  }

  @Deprecated
  public void delete(Long id, Long currentUserId) {
    service.delete(id, currentUserId);
  }

  @GetMapping("/conflicts")
  public ResponseEntity<List<EventConflictDto>> findConflicts(
      @RequestParam Long lobbyId,
      @RequestParam OffsetDateTime start,
      @RequestParam OffsetDateTime end,
      @RequestParam Long requesterId,
      @Parameter(description = "Current user id (temporary for MVP)", example = "42")
      @RequestHeader("X-User-Id") Long currentUserId) {
    ensureRequesterMatchesCurrentUser(requesterId, currentUserId);
    return ResponseEntity.ok(
        service.findConflicts(lobbyId, start, end, currentUserId));
  }

  @GetMapping("/user-conflict")
  public ResponseEntity<UserConflictDto> hasConflict(
      @RequestParam Long userId,
      @RequestParam OffsetDateTime start,
      @RequestParam OffsetDateTime end,
      @RequestParam Long requesterId,
      @Parameter(description = "Current user id (temporary for MVP)", example = "42")
      @RequestHeader("X-User-Id") Long currentUserId) {
    ensureRequesterMatchesCurrentUser(requesterId, currentUserId);
    return ResponseEntity.ok(
        service.hasConflict(userId, start, end, currentUserId));
  }

  private void ensureRequesterMatchesCurrentUser(Long requesterId, Long currentUserId) {
    if (!Objects.equals(requesterId, currentUserId)) {
      throw new ForbiddenException("Requester id must match current user");
    }
  }

}
