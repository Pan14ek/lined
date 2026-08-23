package io.backend.lined.lobby.api;

import io.backend.lined.event.api.FreeSlotDto;
import io.backend.lined.common.VersionPrecondition;
import io.backend.lined.event.service.EventService;
import io.backend.lined.featureflag.api.FeatureRequired;
import io.backend.lined.featureflag.api.LobbiesFeatureRequired;
import io.backend.lined.featureflag.domain.FeatureFlagKey;
import io.backend.lined.lobby.service.LobbyService;
import io.backend.lined.lobby.domain.LobbyLifecycleStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.OffsetDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.ResponseEntity;

@Tag(name = "Lobbies", description = "Manage lobbies (groups)")
@RestController
@RequestMapping("/api/lobbies")
@RequiredArgsConstructor
public class LobbyController {

  private final LobbyService lobbyService;
  private final EventService eventService;

  @Operation(
      summary = "Create lobby",
      description = "Creates a lobby; the requester becomes the owner and is added as a member."
  )
  @PostMapping
  @LobbiesFeatureRequired
  public ResponseEntity<LobbyDto> create(
      @Parameter(description = "Current user id (temporary for MVP)", example = "42")
      @RequestHeader("X-User-Id") Long currentUserId,
      @io.swagger.v3.oas.annotations.parameters.RequestBody(
          required = true,
          description = "Lobby payload",
          content = @Content(schema = @Schema(implementation = LobbyCreateDto.class),
              examples = @ExampleObject(name = "valid", value = """
                      { "name": "Our Family", "lobbyType": "FAMILY" }
                  """)))
      @Valid @RequestBody LobbyCreateDto dto) {
    LobbyDto created = lobbyService.create(dto, currentUserId);
    return ResponseEntity.ok().eTag(VersionPrecondition.etag(created.version())).body(created);
  }

  @Operation(summary = "My lobbies", description = "Returns lobbies where current user is a member.")
  @GetMapping("/mine")
  public List<LobbyDto> mine(
      @Parameter(description = "Current user id (temporary for MVP)", example = "42")
      @RequestHeader("X-User-Id") Long currentUserId) {
    return lobbyService.myLobbies(currentUserId);
  }

  /**
   * Lists archived lobbies that the authenticated caller owns or belongs to.
   *
   * <p>For example, {@code GET /api/lobbies?lifecycleStatus=ARCHIVED} lets a former member view
   * their archived lobby history without exposing unrelated owners' lobbies.</p>
   *
   * @param lifecycleStatus required lifecycle filter; this endpoint currently supports ARCHIVED
   * @param currentUserId authenticated caller identifier
   * @return archived lobbies available to the caller
   */
  @Operation(summary = "List archived lobbies", description = "Lists archived lobbies accessible to the caller.")
  @GetMapping(params = "lifecycleStatus=ARCHIVED")
  public List<LobbyDto> archived(
      @RequestParam LobbyLifecycleStatus lifecycleStatus,
      @RequestHeader("X-User-Id") Long currentUserId) {
    return lobbyService.archivedLobbies(currentUserId);
  }

  @Operation(summary = "Lobby details", description = "Get lobby by ID.")
  @GetMapping("/{id}")
  public ResponseEntity<LobbyDto> get(
      @Parameter(description = "Lobby ID", example = "101") @PathVariable Long id,
      @Parameter(description = "Current user id (temporary for MVP)", example = "42")
      @RequestHeader("X-User-Id") Long currentUserId) {
    LobbyDto lobby = lobbyService.getById(id, currentUserId);
    return ResponseEntity.ok().eTag(VersionPrecondition.etag(lobby.version())).body(lobby);
  }

  @Deprecated
  public ResponseEntity<LobbyDto> get(Long id) {
    LobbyDto lobby = lobbyService.getById(id);
    return ResponseEntity.ok().eTag(VersionPrecondition.etag(lobby.version())).body(lobby);
  }

  /**
   * Selects the owner's single writable lobby when the effective plan is Free.
   *
   * <p>For example, an owner calls {@code POST /api/lobbies/101/select-as-free} after reducing
   * membership; the response makes lobby {@code 101} read-write and clears any old selection.</p>
   *
   * @param id selected lobby identifier
   * @param currentUserId authenticated owner identifier
   * @return selected lobby and its current optimistic-lock ETag
   */
  @Operation(summary = "Select Free lobby", description = "Selects the owner's writable Free-plan lobby.")
  @PostMapping("/{id}/select-as-free")
  @LobbiesFeatureRequired
  public ResponseEntity<LobbyDto> selectAsFree(
      @PathVariable Long id, @RequestHeader("X-User-Id") Long currentUserId) {
    LobbyDto selected = lobbyService.selectAsFree(id, currentUserId);
    return ResponseEntity.ok().eTag(VersionPrecondition.etag(selected.version())).body(selected);
  }

  /**
   * Restores an archived lobby when the owner's effective plan has capacity.
   *
   * <p>For example, an owner with no active Free lobby can restore an archived one; capacity
   * failures use the stable {@code LOBBY_LIMIT_EXCEEDED} conflict code.</p>
   *
   * @param id archived lobby identifier
   * @param currentUserId authenticated owner identifier
   * @return restored lobby and its current optimistic-lock ETag
   */
  @Operation(summary = "Restore archived lobby", description = "Restores an archived lobby when capacity permits.")
  @PostMapping("/{id}/restore")
  @LobbiesFeatureRequired
  public ResponseEntity<LobbyDto> restore(
      @PathVariable Long id, @RequestHeader("X-User-Id") Long currentUserId) {
    LobbyDto restored = lobbyService.restore(id, currentUserId);
    return ResponseEntity.ok().eTag(VersionPrecondition.etag(restored.version())).body(restored);
  }

  @Operation(
      summary = "Find common free slots",
      description = "Returns windows where every lobby member is available without event details."
  )
  @GetMapping("/{id}/free-slots")
  @FeatureRequired(FeatureFlagKey.CALENDARS)
  public List<FreeSlotDto> freeSlots(
      @Parameter(description = "Lobby ID", example = "101") @PathVariable Long id,
      @Parameter(example = "2026-01-01T09:00:00Z")
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime from,
      @Parameter(example = "2026-01-01T22:00:00Z")
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime to,
      @Parameter(description = "Current user id (temporary for MVP)", example = "42")
      @RequestHeader("X-User-Id") Long currentUserId) {
    return eventService.findFreeSlots(id, from, to, currentUserId);
  }

  @Operation(
      summary = "Update lobby",
      description = "Partially update lobby name, type, or owner (owner only)."
  )
  @PatchMapping("/{id}")
  @LobbiesFeatureRequired
  public ResponseEntity<LobbyDto> update(
      @Parameter(description = "Lobby ID", example = "101") @PathVariable Long id,
      @Parameter(description = "Current user id (temporary for MVP)", example = "42")
      @RequestHeader("X-User-Id") Long currentUserId,
      @RequestHeader(value = "If-Match", required = false) String ifMatch,
      @io.swagger.v3.oas.annotations.parameters.RequestBody(
          required = true,
          description = "Fields to update; ownership may transfer only to an existing member",
          content = @Content(schema = @Schema(implementation = LobbyUpdateDto.class),
              examples = @ExampleObject(value = """
                    { "name": "Weekend Crew", "lobbyType": "FRIENDS", "ownerId": 77 }
                  """)))
      @Valid @RequestBody LobbyUpdateDto dto) {
    LobbyDto updated = lobbyService.update(id, dto, currentUserId, VersionPrecondition.parse(ifMatch));
    return ResponseEntity.ok().eTag(VersionPrecondition.etag(updated.version())).body(updated);
  }

  @Deprecated
  public LobbyDto update(Long id, LobbyUpdateDto dto, Long currentUserId) {
    return lobbyService.update(id, dto, currentUserId);
  }

  @Deprecated
  public LobbyDto update(Long id, Long currentUserId, LobbyUpdateDto dto) {
    return lobbyService.update(id, dto, currentUserId);
  }

  @Operation(summary = "Remove member", description = "Remove user from lobby (owner only). Owner cannot be removed.")
  @DeleteMapping("/{id}/members/{userId}")
  @LobbiesFeatureRequired
  public ResponseEntity<LobbyDto> removeMember(
      @Parameter(description = "Lobby ID", example = "101") @PathVariable Long id,
      @Parameter(description = "User ID to remove", example = "77") @PathVariable Long userId,
      @Parameter(description = "Current user id (temporary for MVP)", example = "42")
      @RequestHeader("X-User-Id") Long currentUserId,
      @RequestHeader(value = "If-Match", required = false) String ifMatch) {
    LobbyDto updated = lobbyService.removeMember(
        id, userId, currentUserId, VersionPrecondition.parse(ifMatch));
    return ResponseEntity.ok().eTag(VersionPrecondition.etag(updated.version())).body(updated);
  }

  @Deprecated
  public LobbyDto removeMember(Long id, Long userId, Long currentUserId) {
    return lobbyService.removeMember(id, userId, currentUserId);
  }

  @Operation(summary = "Delete lobby", description = "Delete lobby (owner only).")
  @DeleteMapping("/{id}")
  @LobbiesFeatureRequired
  public void delete(
      @Parameter(description = "Lobby ID", example = "101") @PathVariable Long id,
      @Parameter(description = "Current user id (temporary for MVP)", example = "42")
      @RequestHeader("X-User-Id") Long currentUserId,
      @RequestHeader(value = "If-Match", required = false) String ifMatch) {
    lobbyService.delete(id, currentUserId, VersionPrecondition.parse(ifMatch));
  }

  @Deprecated
  public void delete(Long id, Long currentUserId) {
    lobbyService.delete(id, currentUserId);
  }

}
