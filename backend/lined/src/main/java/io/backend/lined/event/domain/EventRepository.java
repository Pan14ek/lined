package io.backend.lined.event.domain;

import java.time.OffsetDateTime;
import java.util.Set;
import java.util.List;
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

}
