package io.backend.lined.event.domain;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Modifying;
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

  /**
   * Finds only events whose details may be shown to one lobby member.
   *
   * <p>For example, requester {@code 42} receives every shared dinner in lobby {@code 101} and
   * their own private appointment, but the database never returns user {@code 77}'s private
   * appointment for later in-memory filtering. Keeping the predicate in this query prevents
   * titles and locations from reaching a mapper, logger, or caller that should not see them.</p>
   *
   * @param lobbyId lobby containing the events
   * @param requesterId member requesting the calendar window
   * @param from inclusive window start
   * @param to exclusive window end
   * @return visible overlapping events, ordered by start time
   */
  @Query("""
      SELECT e FROM EventEntity e
      WHERE e.lobby.id = :lobbyId
        AND e.startAt < :to
        AND e.endAt > :from
        AND (e.visibility = io.backend.lined.event.domain.EventVisibility.SHARED
             OR e.owner.id = :requesterId)
      ORDER BY e.startAt ASC
      """)
  List<EventEntity> findVisibleOverlapping(@Param("lobbyId") Long lobbyId,
                                            @Param("requesterId") Long requesterId,
                                            @Param("from") OffsetDateTime from,
                                            @Param("to") OffsetDateTime to);

  /**
   * Resolves an event only when it is shared or owned by the requester.
   *
   * <p>For example, a guessed identifier for another member's private event produces an empty
   * result, allowing the service to return the same {@code 404 Not Found} as an unknown ID rather
   * than confirming that a private event exists.</p>
   *
   * @param eventId requested event identifier
   * @param requesterId caller identity
   * @return visible event, if one exists
   */
  @Query("""
      SELECT e FROM EventEntity e
      WHERE e.id = :eventId
        AND (e.visibility = io.backend.lined.event.domain.EventVisibility.SHARED
             OR e.owner.id = :requesterId)
      """)
  Optional<EventEntity> findVisibleById(@Param("eventId") Long eventId,
                                         @Param("requesterId") Long requesterId);

  /**
   * Detects a private event denied by the visibility predicate without selecting its content.
   *
   * <p>For example, this permits a bounded operational counter for user {@code 42} attempting to
   * read user {@code 77}'s private event, while the HTTP response remains the same {@code 404} as
   * an unknown event and no title, location, or owner data reaches application code.</p>
   *
   * @param eventId requested event identifier
   * @param requesterId caller identity
   * @return whether a private event exists with a different owner
   */
  @Query("""
      SELECT CASE WHEN COUNT(e) > 0 THEN true ELSE false END FROM EventEntity e
      WHERE e.id = :eventId
        AND e.visibility = io.backend.lined.event.domain.EventVisibility.PRIVATE
        AND e.owner.id <> :requesterId
      """)
  boolean existsPrivateEventOwnedByAnotherUser(@Param("eventId") Long eventId,
                                                @Param("requesterId") Long requesterId);

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
            e.visibility = io.backend.lined.event.domain.EventVisibility.SHARED
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
         OR (e.visibility = io.backend.lined.event.domain.EventVisibility.SHARED
             AND (e.lobby.owner.id = :userId OR member.id = :userId))
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

  /**
   * Finds unsent events in the bounded horizon used by the minute scheduler.
   *
   * <p>For example, a dinner in three days with a four-day override is returned, while an event
   * with {@code reminderMinutesBefore = 0} is filtered by the service without creating an inbox
   * entry.</p>
   *
   * @param now current UTC time
   * @param horizon latest candidate start time, at most seven days away
   * @return candidates with recipient associations initialized
   */
  @EntityGraph(attributePaths = {"lobby", "lobby.owner", "lobby.members", "owner"})
  @Query("""
      SELECT e FROM EventEntity e
      WHERE e.reminderSentAt IS NULL
        AND e.startAt >= :now
        AND e.startAt <= :horizon
      ORDER BY e.startAt ASC
      """)
  List<EventEntity> findReminderCandidates(@Param("now") OffsetDateTime now,
                                            @Param("horizon") OffsetDateTime horizon);

  /**
   * Atomically claims a reminder occurrence for a single scheduler replica.
   *
   * <p>For example, two pods may read the same event, but only the row matching its original
   * version and an empty marker receives a {@code reminderSentAt}; the loser returns zero and
   * emits nothing.</p>
   *
   * @param eventId event identifier
   * @param expectedVersion version observed while selecting the candidate
   * @param sentAt marker timestamp
   * @return {@code 1} for the winning replica, otherwise {@code 0}
   */
  @Modifying(flushAutomatically = true, clearAutomatically = true)
  @Query("""
      UPDATE EventEntity e
      SET e.reminderSentAt = :sentAt, e.version = e.version + 1
      WHERE e.id = :eventId
        AND e.version = :expectedVersion
        AND e.reminderSentAt IS NULL
      """)
  int claimReminder(@Param("eventId") Long eventId, @Param("expectedVersion") long expectedVersion,
                    @Param("sentAt") OffsetDateTime sentAt);

}
