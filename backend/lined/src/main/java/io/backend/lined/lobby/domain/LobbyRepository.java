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
   * Returns the owner's lobby currently selected as their Free-plan resource, if any.
   *
   * <p>For example, when a Free owner selects lobby {@code 101}, a later selection of lobby
   * {@code 102} obtains {@code 101} through this query so the earlier selection can be cleared.</p>
   *
   * @param ownerId identifier of the owner whose selection is requested
   * @return all selected lobbies for defensive cleanup of legacy duplicate selections
   */
  List<LobbyEntity> findAllByOwner_IdAndSelectedAsFreeAtIsNotNull(Long ownerId);

  /**
   * Counts active lobbies for capacity checks that restore an archived lobby.
   *
   * <p>For example, restoring an archived Free-plan lobby is allowed when this returns
   * {@code 0}, but is rejected when it returns {@code 1}.</p>
   *
   * @param ownerId identifier of the lobby owner
   * @param lifecycleStatus lifecycle state to count
   * @return number of owned lobbies in the requested state
   */
  long countByOwner_IdAndLifecycleStatus(Long ownerId, LobbyLifecycleStatus lifecycleStatus);

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
   * Finds lobbies in one lifecycle state that the caller owns or belongs to.
   *
   * <p>For example, an owner sees every one of their archived lobbies, whereas a non-owner sees
   * only archived lobbies whose member set includes that user.</p>
   *
   * @param lifecycleStatus state to list, normally {@code ARCHIVED}
   * @param userId authenticated caller identifier
   * @return distinct accessible lobbies with the requested lifecycle state
   */
  @Query("SELECT DISTINCT l FROM LobbyEntity l LEFT JOIN l.members m "
      + "WHERE l.lifecycleStatus = :lifecycleStatus "
      + "AND (l.owner.id = :userId OR m.id = :userId)")
  List<LobbyEntity> findAccessibleByLifecycleStatus(
      @Param("lifecycleStatus") LobbyLifecycleStatus lifecycleStatus, @Param("userId") Long userId);

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
