package io.backend.lined.event.domain;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface EventRepository extends JpaRepository<EventEntity, Long>,
    JpaSpecificationExecutor<EventEntity> {

  @Query("""
         SELECT e FROM EventEntity e
         WHERE e.lobby.id = :lobbyId
           AND e.startAt < :to
           AND e.endAt   > :from
         ORDER BY e.startAt ASC
      """)
  List<EventEntity> findOverlapping(
      @Param("lobbyId") Long lobbyId,
      @Param("from") OffsetDateTime from,
      @Param("to") OffsetDateTime to
  );

  @Query("""
      SELECT e FROM EventEntity e
      WHERE e.owner.id = :userId
      AND e.startAt < :to
      AND e.endAt > :from
      ORDER BY e.startAt ASC
      """)
  List<EventEntity> findOverlappingByUser(
      @Param("userId") Long userId,
      @Param("from") OffsetDateTime from,
      @Param("to") OffsetDateTime to
  );

  /**
   * Finds events that block at least one supplied member, ordered for linear free-slot calculation.
   */
  @Query("""
      SELECT DISTINCT e FROM EventEntity e
      LEFT JOIN e.lobby.members sharedMember
      WHERE e.startAt < :to
        AND e.endAt > :from
        AND (
          e.owner.id IN :memberIds
          OR (
            e.shared = true
            AND (e.lobby.owner.id IN :memberIds OR sharedMember.id IN :memberIds)
          )
        )
      ORDER BY e.startAt ASC
      """)
  List<EventEntity> findBusyForMemberIds(
      @Param("memberIds") Set<Long> memberIds,
      @Param("from") OffsetDateTime from,
      @Param("to") OffsetDateTime to
  );

  /**
   * Finds the events visible in a user's personal calendar feed.
   *
   * <p>For example, user {@code 42} receives their private work block and a shared dinner in a
   * lobby they joined, but never another member's private work block. {@code DISTINCT} is needed
   * because a user's owner and member relationships can both match the same shared event.</p>
   *
   * @param userId feed owner's identifier
   * @return events that can be exported to that owner's calendar subscription
   */
  @Query("""
      SELECT DISTINCT e FROM EventEntity e
      LEFT JOIN e.lobby.members member
      WHERE e.owner.id = :userId
         OR (e.shared = true AND (e.lobby.owner.id = :userId OR member.id = :userId))
      ORDER BY e.startAt ASC
      """)
  List<EventEntity> findFeedEvents(@Param("userId") Long userId);

  /**
   * Resolves an imported external event by its owner, destination lobby, and RFC 5545 UID.
   *
   * <p>For example, importing {@code UID:work-17@example.com} a second time into lobby
   * {@code 101} for user {@code 42} returns the existing private event for update. The same UID
   * may still be imported independently by another user or into another lobby.</p>
   *
   * @param ownerId importing user's identifier
   * @param lobbyId destination lobby identifier
   * @param icsUid source calendar UID
   * @return matching imported event, if one exists
   */
  Optional<EventEntity> findByOwner_IdAndLobby_IdAndIcsUid(Long ownerId, Long lobbyId,
                                                            String icsUid);

}
