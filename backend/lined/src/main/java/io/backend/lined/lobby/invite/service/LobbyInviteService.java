package io.backend.lined.lobby.invite.service;

import io.backend.lined.lobby.invite.api.LobbyInviteDto;
import java.util.List;

public interface LobbyInviteService {

  LobbyInviteDto create(Long lobbyId, Long inviteeId, Long requesterId);

  List<LobbyInviteDto> pendingForLobby(Long lobbyId, Long requesterId);

  List<LobbyInviteDto> pendingForInvitee(Long inviteeId);

  LobbyInviteDto resend(Long lobbyId, Long inviteId, Long requesterId);

  LobbyInviteDto cancel(Long lobbyId, Long inviteId, Long requesterId);

  LobbyInviteDto accept(Long inviteId, Long requesterId);

  LobbyInviteDto decline(Long inviteId, Long requesterId);
}
