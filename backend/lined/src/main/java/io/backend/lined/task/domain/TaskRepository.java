package io.backend.lined.task.domain;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface TaskRepository extends JpaRepository<TaskEntity, Long>,
    JpaSpecificationExecutor<TaskEntity> {

  /**
   * Lists tasks visible to a lobby member while applying optional endpoint filters in the database.
   *
   * <p>For example, requester {@code 42} sees shared lobby tasks plus their own private tasks,
   * never a private task created by user {@code 77}.</p>
   */
  @EntityGraph(attributePaths = {"lobby", "creator", "assignee"})
  @Query("""
      SELECT DISTINCT t FROM TaskEntity t JOIN t.lobby l JOIN l.members m
      WHERE m.id = :requesterId
        AND (:lobbyId IS NULL OR l.id = :lobbyId)
        AND (:assigneeId IS NULL OR t.assignee.id = :assigneeId)
        AND (:status IS NULL OR t.status = :status)
        AND (t.visibility = io.backend.lined.task.domain.TaskVisibility.SHARED
             OR t.creator.id = :requesterId)
      """)
  List<TaskEntity> findVisible(Long requesterId, Long lobbyId, Long assigneeId,
                               TaskStatus status);

  /**
   * Lists the requester's actionable shared tasks plus their private tasks across member lobbies.
   *
   * <p>For example, an assignee sees a shared grocery task assigned to them and their own private
   * surprise task, but not a partner's private task.</p>
   */
  @EntityGraph(attributePaths = {"lobby", "creator", "assignee"})
  @Query("""
      SELECT DISTINCT t FROM TaskEntity t JOIN t.lobby l JOIN l.members m
      WHERE m.id = :requesterId
        AND ((t.visibility = io.backend.lined.task.domain.TaskVisibility.SHARED
              AND t.assignee.id = :requesterId)
             OR (t.visibility = io.backend.lined.task.domain.TaskVisibility.PRIVATE
                 AND t.creator.id = :requesterId))
      """)
  List<TaskEntity> findVisibleMine(@Param("requesterId") Long requesterId);

  /**
   * Finds a task only when its visibility rule permits the requester to observe it.
   *
   * <p>For example, a guessed private task ID belonging to a different creator returns an empty
   * result and is therefore indistinguishable from an unknown task.</p>
   */
  @EntityGraph(attributePaths = {"lobby", "lobby.members", "creator", "assignee"})
  @Query("""
      SELECT t FROM TaskEntity t
      WHERE t.id = :taskId
        AND (t.visibility = io.backend.lined.task.domain.TaskVisibility.SHARED
             OR t.creator.id = :requesterId)
      """)
  Optional<TaskEntity> findVisibleById(@Param("taskId") Long taskId,
                                        @Param("requesterId") Long requesterId);

  /**
   * Finds unfinished tasks due on the supplied UTC calendar date that have not yet been reminded.
   *
   * <p>For example, a {@code TODO} task due today is included even if it was rescheduled from a
   * previously reminded date; a {@code DONE} task is never included.</p>
   *
   * @param today current UTC date after the 08:00 reminder cutoff
   * @return due-task candidates with their recipient and lobby associations initialized
   */
  @EntityGraph(attributePaths = {"lobby", "lobby.owner", "lobby.members", "creator", "assignee"})
  @Query("""
      SELECT t FROM TaskEntity t
      WHERE t.dueDate = :today
        AND t.status <> io.backend.lined.task.domain.TaskStatus.DONE
        AND (t.dueReminderSentForDate IS NULL OR t.dueReminderSentForDate <> :today)
      """)
  List<TaskEntity> findDueReminderCandidates(@Param("today") LocalDate today);

  /**
   * Atomically claims a task's due-date reminder for one scheduler replica.
   *
   * <p>For example, after one pod marks task {@code 55} for {@code 2026-07-25}, another pod's
   * same-date claim returns zero and therefore cannot create a duplicate inbox entry.</p>
   *
   * @param taskId task identifier
   * @param expectedVersion version observed while selecting the candidate
   * @param today due date being marked as processed
   * @return {@code 1} for the winning replica, otherwise {@code 0}
   */
  @Modifying(flushAutomatically = true, clearAutomatically = true)
  @Query("""
      UPDATE TaskEntity t
      SET t.dueReminderSentForDate = :today, t.version = t.version + 1
      WHERE t.id = :taskId
        AND t.version = :expectedVersion
        AND t.dueDate = :today
        AND t.status <> io.backend.lined.task.domain.TaskStatus.DONE
        AND (t.dueReminderSentForDate IS NULL OR t.dueReminderSentForDate <> :today)
      """)
  int claimDueReminder(@Param("taskId") Long taskId, @Param("expectedVersion") long expectedVersion,
                       @Param("today") LocalDate today);
}
