package io.backend.lined.lobby.invite.api;

import io.backend.lined.featureflag.api.LobbiesFeatureRequired;
import io.backend.lined.lobby.invite.service.LobbyInviteService;
import io.backend.lined.security.CurrentUserProvider;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Lobby invites", description = "Manage consent-based lobby membership invitations")
@RestController
@RequiredArgsConstructor
@LobbiesFeatureRequired
public class LobbyInviteController {

  private final LobbyInviteService inviteService;
  private final CurrentUserProvider currentUserProvider;

  @Operation(summary = "Create lobby invite", description = "Lobby owner only; does not add membership.")
  @PostMapping("/api/lobbies/{lobbyId}/invites")
  public LobbyInviteDto create(
      @PathVariable Long lobbyId,
      @RequestParam(required = false) Long userId,
      @RequestParam(required = false) String userEmail) {
    return inviteService.create(lobbyId, userId, userEmail, currentUserProvider.requireUserId());
  }

  @Operation(summary = "List pending lobby invites", description = "Lobby owner only.")
  @GetMapping("/api/lobbies/{lobbyId}/invites")
  public List<LobbyInviteDto> pendingForLobby(
      @PathVariable Long lobbyId) {
    return inviteService.pendingForLobby(lobbyId, currentUserProvider.requireUserId());
  }

  @Operation(summary = "Resend lobby invite", description = "Lobby owner only; renews sent time.")
  @PostMapping("/api/lobbies/{lobbyId}/invites/{inviteId}/resend")
  public LobbyInviteDto resend(
      @PathVariable Long lobbyId,
      @PathVariable Long inviteId) {
    return inviteService.resend(lobbyId, inviteId, currentUserProvider.requireUserId());
  }

  @Operation(summary = "Cancel lobby invite", description = "Lobby owner only.")
  @DeleteMapping("/api/lobbies/{lobbyId}/invites/{inviteId}")
  public LobbyInviteDto cancel(
      @PathVariable Long lobbyId,
      @PathVariable Long inviteId) {
    return inviteService.cancel(lobbyId, inviteId, currentUserProvider.requireUserId());
  }

  @Operation(summary = "My pending lobby invites")
  @GetMapping("/api/lobby-invites/mine")
  public List<LobbyInviteDto> mine() {
    return inviteService.pendingForInvitee(currentUserProvider.requireUserId());
  }

  @Operation(summary = "Accept lobby invite", description = "Only the invited user can accept.")
  @PostMapping("/api/lobby-invites/{inviteId}/accept")
  public LobbyInviteDto accept(@PathVariable Long inviteId) {
    return inviteService.accept(inviteId, currentUserProvider.requireUserId());
  }

  @Operation(summary = "Decline lobby invite", description = "Only the invited user can decline.")
  @PostMapping("/api/lobby-invites/{inviteId}/decline")
  public LobbyInviteDto decline(@PathVariable Long inviteId) {
    return inviteService.decline(inviteId, currentUserProvider.requireUserId());
  }
}
