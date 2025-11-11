package io.backend.lined.lobby.api;

import io.backend.lined.lobby.service.LobbyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
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

  @Operation(summary = "Add member", description = "Add user to lobby (owner only).")
  @PostMapping("/{id}/members")
  public LobbyDto addMember(
      @Parameter(description = "Lobby ID", example = "101") @PathVariable Long id,
      @Parameter(description = "Current user id (temporary for MVP)", example = "42")
      @RequestHeader("X-User-Id") Long currentUserId,
      @Parameter(description = "User ID to add", example = "77") @RequestParam Long userId) {
    return lobbyService.addMember(id, userId, currentUserId);
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
