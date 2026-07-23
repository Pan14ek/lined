package io.backend.lined.lobby.domain;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface LobbyRepository extends JpaRepository<LobbyEntity, Long> {

  List<LobbyEntity> findAllByOwner_Id(Long ownerId);

  /**
   * Counts lobbies currently owned by one user.
   *
   * <p>For example, {@code countByOwner_Id(42L)} returns {@code 1} when user {@code 42}
   * already owns the one lobby allowed by the Free entitlement. BE-03 will refine this query to
   * exclude archived lobbies once lifecycle status exists.</p>
   *
   * @param ownerId identifier of the lobby owner
   * @return number of lobbies owned by {@code ownerId}
   */
  long countByOwner_Id(Long ownerId);

  @Query("SELECT l FROM LobbyEntity l JOIN l.members m WHERE m.id = :userId")
  List<LobbyEntity> findAllByMemberId(@Param("userId") Long userId);

  /**
   * Counts the current members of one lobby without materializing the member collection.
   *
   * <p>For example, {@code countMembersByLobbyId(101L)} returns {@code 4} for a Free-owned
   * lobby at capacity, so accepting another invitation must be rejected before the invite is
   * transitioned.</p>
   *
   * @param lobbyId identifier of the lobby whose membership is counted
   * @return number of users currently in the lobby, or {@code 0} when it has no members
   */
  @Query("SELECT COUNT(member) FROM LobbyEntity lobby JOIN lobby.members member WHERE lobby.id = :lobbyId")
  long countMembersByLobbyId(@Param("lobbyId") Long lobbyId);

}
