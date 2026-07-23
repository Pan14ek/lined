package io.backend.lined.lobby.invite.domain;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface LobbyInviteRepository extends JpaRepository<LobbyInviteEntity, Long> {

  Optional<LobbyInviteEntity> findByLobby_IdAndInvitee_IdAndStatus(
      Long lobbyId, Long inviteeId, LobbyInviteStatus status);

  List<LobbyInviteEntity> findAllByLobby_IdAndStatusOrderBySentAtDesc(
      Long lobbyId, LobbyInviteStatus status);

  List<LobbyInviteEntity> findAllByInvitee_IdAndStatusOrderBySentAtDesc(
      Long inviteeId, LobbyInviteStatus status);

  @Modifying(flushAutomatically = true)
  @Query("""
      update LobbyInviteEntity invite
         set invite.status = io.backend.lined.lobby.invite.domain.LobbyInviteStatus.ACCEPTED,
             invite.updatedAt = :updatedAt
       where invite.id = :inviteId
         and invite.invitee.id = :inviteeId
         and invite.status = io.backend.lined.lobby.invite.domain.LobbyInviteStatus.PENDING
      """)
  int acceptPending(
      @Param("inviteId") Long inviteId,
      @Param("inviteeId") Long inviteeId,
      @Param("updatedAt") OffsetDateTime updatedAt);

  @Modifying(flushAutomatically = true)
  @Query("""
      update LobbyInviteEntity invite
         set invite.status = :status,
             invite.updatedAt = :updatedAt
       where invite.id = :inviteId
         and invite.status = io.backend.lined.lobby.invite.domain.LobbyInviteStatus.PENDING
      """)
  int transitionPending(
      @Param("inviteId") Long inviteId,
      @Param("status") LobbyInviteStatus status,
      @Param("updatedAt") OffsetDateTime updatedAt);
}
