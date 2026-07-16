package io.backend.lined.lobby.invite.service;

import io.backend.lined.lobby.invite.api.LobbyInviteDto;
import java.util.List;

/**
 * Service boundary for consent-based lobby membership invitations.
 * A user becomes a lobby member only after accepting a pending invitation.
 */
public interface LobbyInviteService {

  /**
   * Creates a pending invitation for an existing user selected by ID or email.
   *
   * @param lobbyId the target lobby ID
   * @param inviteeId the invitee ID, mutually exclusive with {@code inviteeEmail}
   * @param inviteeEmail the invitee email, mutually exclusive with {@code inviteeId}
   * @param requesterId the lobby owner requesting the invitation
   * @return the created pending invitation
   */
  LobbyInviteDto create(Long lobbyId, Long inviteeId, String inviteeEmail, Long requesterId);

  /**
   * Lists pending invitations for a lobby.
   *
   * @param lobbyId the lobby ID
   * @param requesterId the requesting lobby owner
   * @return pending invitations, newest first
   */
  List<LobbyInviteDto> pendingForLobby(Long lobbyId, Long requesterId);

  /**
   * Lists the pending invitations addressed to an invitee.
   *
   * @param inviteeId the invitee ID
   * @return pending invitations, newest first
   */
  List<LobbyInviteDto> pendingForInvitee(Long inviteeId);

  /**
   * Renews the recorded send time of a pending invitation.
   *
   * @param lobbyId the lobby ID
   * @param inviteId the invitation ID
   * @param requesterId the requesting lobby owner
   * @return the renewed invitation
   */
  LobbyInviteDto resend(Long lobbyId, Long inviteId, Long requesterId);

  /**
   * Cancels a pending invitation.
   *
   * @param lobbyId the lobby ID
   * @param inviteId the invitation ID
   * @param requesterId the requesting lobby owner
   * @return the cancelled invitation
   */
  LobbyInviteDto cancel(Long lobbyId, Long inviteId, Long requesterId);

  /**
   * Accepts a pending invitation and adds the invitee to its lobby.
   *
   * @param inviteId the invitation ID
   * @param requesterId the invited user ID
   * @return the accepted invitation
   */
  LobbyInviteDto accept(Long inviteId, Long requesterId);

  /**
   * Declines a pending invitation without changing lobby membership.
   *
   * @param inviteId the invitation ID
   * @param requesterId the invited user ID
   * @return the declined invitation
   */
  LobbyInviteDto decline(Long inviteId, Long requesterId);
}
