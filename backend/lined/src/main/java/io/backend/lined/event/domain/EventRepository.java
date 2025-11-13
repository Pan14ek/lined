package io.backend.lined.event.domain;

import java.time.OffsetDateTime;
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

}
