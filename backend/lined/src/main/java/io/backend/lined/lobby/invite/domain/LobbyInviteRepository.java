package io.backend.lined.lobby.invite.domain;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LobbyInviteRepository extends JpaRepository<LobbyInviteEntity, Long> {

  Optional<LobbyInviteEntity> findByLobby_IdAndInvitee_IdAndStatus(
      Long lobbyId, Long inviteeId, LobbyInviteStatus status);

  List<LobbyInviteEntity> findAllByLobby_IdAndStatusOrderBySentAtDesc(
      Long lobbyId, LobbyInviteStatus status);

  List<LobbyInviteEntity> findAllByInvitee_IdAndStatusOrderBySentAtDesc(
      Long inviteeId, LobbyInviteStatus status);
}
