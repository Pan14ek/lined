package io.backend.lined.lobby.invite.api;

import io.backend.lined.lobby.invite.service.LobbyInviteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Lobby invites", description = "Manage consent-based lobby membership invitations")
@RestController
@RequiredArgsConstructor
public class LobbyInviteController {

  private final LobbyInviteService inviteService;

  @Operation(summary = "Create lobby invite", description = "Lobby owner only; does not add membership.")
  @PostMapping("/api/lobbies/{lobbyId}/invites")
  public LobbyInviteDto create(
      @PathVariable Long lobbyId,
      @RequestParam(required = false) Long userId,
      @RequestParam(required = false) String userEmail,
      @RequestHeader("X-User-Id") Long currentUserId) {
    return inviteService.create(lobbyId, userId, userEmail, currentUserId);
  }

  @Operation(summary = "List pending lobby invites", description = "Lobby owner only.")
  @GetMapping("/api/lobbies/{lobbyId}/invites")
  public List<LobbyInviteDto> pendingForLobby(
      @PathVariable Long lobbyId,
      @RequestHeader("X-User-Id") Long currentUserId) {
    return inviteService.pendingForLobby(lobbyId, currentUserId);
  }

  @Operation(summary = "Resend lobby invite", description = "Lobby owner only; renews sent time.")
  @PostMapping("/api/lobbies/{lobbyId}/invites/{inviteId}/resend")
  public LobbyInviteDto resend(
      @PathVariable Long lobbyId,
      @PathVariable Long inviteId,
      @RequestHeader("X-User-Id") Long currentUserId) {
    return inviteService.resend(lobbyId, inviteId, currentUserId);
  }

  @Operation(summary = "Cancel lobby invite", description = "Lobby owner only.")
  @DeleteMapping("/api/lobbies/{lobbyId}/invites/{inviteId}")
  public LobbyInviteDto cancel(
      @PathVariable Long lobbyId,
      @PathVariable Long inviteId,
      @RequestHeader("X-User-Id") Long currentUserId) {
    return inviteService.cancel(lobbyId, inviteId, currentUserId);
  }

  @Operation(summary = "My pending lobby invites")
  @GetMapping("/api/lobby-invites/mine")
  public List<LobbyInviteDto> mine(
      @Parameter(description = "Current user id (temporary for MVP)")
      @RequestHeader("X-User-Id") Long currentUserId) {
    return inviteService.pendingForInvitee(currentUserId);
  }

  @Operation(summary = "Accept lobby invite", description = "Only the invited user can accept.")
  @PostMapping("/api/lobby-invites/{inviteId}/accept")
  public LobbyInviteDto accept(
      @PathVariable Long inviteId,
      @RequestHeader("X-User-Id") Long currentUserId) {
    return inviteService.accept(inviteId, currentUserId);
  }

  @Operation(summary = "Decline lobby invite", description = "Only the invited user can decline.")
  @PostMapping("/api/lobby-invites/{inviteId}/decline")
  public LobbyInviteDto decline(
      @PathVariable Long inviteId,
      @RequestHeader("X-User-Id") Long currentUserId) {
    return inviteService.decline(inviteId, currentUserId);
  }
}
