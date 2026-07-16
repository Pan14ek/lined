package io.backend.lined.event.api;

import io.backend.lined.common.exception.ForbiddenException;
import io.backend.lined.event.service.EventService;
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
public class EventController {

  private final EventService service;

  @Operation(summary = "Create event", description = "Create personal/shared event in a lobby.")
  @PostMapping("/events")
  public EventDto create(
      @Parameter(description = "Current user id (temporary for MVP)", example = "42")
      @RequestHeader("X-User-Id") Long currentUserId,
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
                      "lobbyId":101,
                      "notifyMembers":true
                    }
                  """)))
      @Valid @RequestBody EventCreateDto dto) {
    return service.create(dto, currentUserId);
  }

  @Operation(summary = "Update event",
      description = "Partial update: title/location/shared/startAt/endAt/timezone. "
          + "Blank location clears it; omitted location is unchanged.")
  @PatchMapping("/events/{id}")
  public EventDto update(
      @Parameter(example = "9001") @PathVariable Long id,
      @Parameter(description = "Current user id (temporary for MVP)", example = "42")
      @RequestHeader("X-User-Id") Long currentUserId,
      @io.swagger.v3.oas.annotations.parameters.RequestBody(
          required = true,
          content = @Content(schema = @Schema(implementation = EventUpdateDto.class),
              examples = @ExampleObject(value = """
                    { "location":"Central Park", "startAt":"2025-11-20T18:00:00Z" }
                  """)))
      @Valid @RequestBody EventUpdateDto dto) {
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

  @Operation(summary = "Delete event", description = "Delete event (lobby owner/member).")
  @DeleteMapping("/events/{id}")
  public void delete(
      @Parameter(example = "9001") @PathVariable Long id,
      @Parameter(description = "Current user id (temporary for MVP)", example = "42")
      @RequestHeader("X-User-Id") Long currentUserId) {
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
