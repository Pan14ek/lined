package io.backend.lined.lobby.api;

import io.backend.lined.event.api.FreeSlotDto;
import io.backend.lined.event.service.EventService;
import io.backend.lined.lobby.service.LobbyService;
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
  public LobbyDto create(
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
    return lobbyService.create(dto, currentUserId);
  }

  @Operation(summary = "My lobbies", description = "Returns lobbies where current user is a member.")
  @GetMapping("/mine")
  public List<LobbyDto> mine(
      @Parameter(description = "Current user id (temporary for MVP)", example = "42")
      @RequestHeader("X-User-Id") Long currentUserId) {
    return lobbyService.myLobbies(currentUserId);
  }

  @Operation(summary = "Lobby details", description = "Get lobby by ID.")
  @GetMapping("/{id}")
  public LobbyDto get(
      @Parameter(description = "Lobby ID", example = "101") @PathVariable Long id) {
    return lobbyService.getById(id);
  }

  @Operation(
      summary = "Find common free slots",
      description = "Returns windows where every lobby member is available without event details."
  )
  @GetMapping("/{id}/free-slots")
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
  public LobbyDto update(
      @Parameter(description = "Lobby ID", example = "101") @PathVariable Long id,
      @Parameter(description = "Current user id (temporary for MVP)", example = "42")
      @RequestHeader("X-User-Id") Long currentUserId,
      @io.swagger.v3.oas.annotations.parameters.RequestBody(
          required = true,
          description = "Fields to update; ownership may transfer only to an existing member",
          content = @Content(schema = @Schema(implementation = LobbyUpdateDto.class),
              examples = @ExampleObject(value = """
                    { "name": "Weekend Crew", "lobbyType": "FRIENDS", "ownerId": 77 }
                  """)))
      @Valid @RequestBody LobbyUpdateDto dto) {
    return lobbyService.update(id, dto, currentUserId);
  }

  @Operation(summary = "Remove member", description = "Remove user from lobby (owner only). Owner cannot be removed.")
  @DeleteMapping("/{id}/members/{userId}")
  public LobbyDto removeMember(
      @Parameter(description = "Lobby ID", example = "101") @PathVariable Long id,
      @Parameter(description = "User ID to remove", example = "77") @PathVariable Long userId,
      @Parameter(description = "Current user id (temporary for MVP)", example = "42")
      @RequestHeader("X-User-Id") Long currentUserId) {
    return lobbyService.removeMember(id, userId, currentUserId);
  }

  @Operation(summary = "Delete lobby", description = "Delete lobby (owner only).")
  @DeleteMapping("/{id}")
  public void delete(
      @Parameter(description = "Lobby ID", example = "101") @PathVariable Long id,
      @Parameter(description = "Current user id (temporary for MVP)", example = "42")
      @RequestHeader("X-User-Id") Long currentUserId) {
    lobbyService.delete(id, currentUserId);
  }

}
