package io.backend.lined.task.domain;

import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface TaskRepository extends JpaRepository<TaskEntity, Long>,
    JpaSpecificationExecutor<TaskEntity> {

  @EntityGraph(attributePaths = {"lobby", "creator", "assignee"})
  @Query("SELECT t FROM TaskEntity t JOIN t.lobby l JOIN l.members m WHERE m.id = :userId")
  List<TaskEntity> findAllByLobbyMemberId(@Param("userId") Long userId);
}
