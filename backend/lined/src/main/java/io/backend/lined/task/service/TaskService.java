package io.backend.lined.task.service;

import io.backend.lined.common.exception.BadRequestException;
import io.backend.lined.common.exception.ForbiddenException;
import io.backend.lined.common.exception.NotFoundException;
import io.backend.lined.task.api.TaskCreateDto;
import io.backend.lined.task.api.TaskDto;
import io.backend.lined.task.api.TaskUpdateDto;
import java.util.List;

/**
 * Service interface for managing lobby tasks.
 * Provides CRUD operations and filtering for the shared task list.
 */
public interface TaskService {

  /**
   * Creates a new task within a lobby.
   *
   * @param dto           the task creation data
   * @param currentUserId the ID of the user creating the task
   * @return the created task as a DTO
   * @throws ForbiddenException if the user is not a lobby member
   * @throws NotFoundException  if the lobby or user is not found
   */
  TaskDto create(TaskCreateDto dto, Long currentUserId, String idempotencyKey);

  @Deprecated
  default TaskDto create(TaskCreateDto dto, Long currentUserId) {
    return create(dto, currentUserId, null);
  }

  /**
   * Updates an existing task.
   * Only non-null fields in the DTO are applied.
   *
   * @param id            the task ID to update
   * @param dto           the update data
   * @param currentUserId the ID of the requesting user
   * @return the updated task as a DTO
   * @throws ForbiddenException if the user is not a lobby member
   * @throws NotFoundException  if the task is not found
   */
  TaskDto update(Long id, TaskUpdateDto dto, Long currentUserId, long expectedVersion);

  @Deprecated
  default TaskDto update(Long id, TaskUpdateDto dto, Long currentUserId) {
    return update(id, dto, currentUserId, -1L);
  }

  /**
   * Deletes a task by its unique identifier.
   *
   * @param id            the task ID to delete
   * @param currentUserId the ID of the requesting user
   * @throws ForbiddenException if the user is not a lobby member
   * @throws NotFoundException  if the task is not found
   */
  void delete(Long id, Long currentUserId, long expectedVersion);

  @Deprecated
  default void delete(Long id, Long currentUserId) {
    delete(id, currentUserId, -1L);
  }

  /**
   * Lists the requester's visible tasks with optional filtering by lobby, assignee, and status.
   *
   * <p>For example, requester {@code 42} receives shared tasks from their lobbies and their own
   * private tasks, but never a private task created by user {@code 77}.</p>
   *
   * @param lobbyId    the lobby ID to filter by, or null for all lobbies
   * @param assigneeId the assignee user ID to filter by, or null for all assignees
   * @param status     the task status string to filter by (e.g. "TODO", "DONE"), or null for all
   * @param currentUserId authenticated requester whose membership and visibility determine results
   * @return a list of matching tasks
   * @throws BadRequestException if {@code status} is not a valid {@link io.backend.lined.task.domain.TaskStatus} value
   */
  List<TaskDto> list(Long lobbyId, Long assigneeId, String status, Long currentUserId);

  /**
   * Lists the requester's actionable shared tasks and creator-owned private tasks.
   *
   * <p>For example, a shared task assigned to the requester is included, as is a private task the
   * requester created; a partner's private task is absent even when both users share a lobby.</p>
   *
   * @param currentUserId the ID of the requesting user
   * @return tasks visible under the task privacy rule
   */
  List<TaskDto> listMine(Long currentUserId);

}
