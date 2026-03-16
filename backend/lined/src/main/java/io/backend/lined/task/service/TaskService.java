package io.backend.lined.task.service;


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
   * @throws SecurityException      if the user is not a lobby member
   * @throws NoSuchElementException if the lobby or user is not found
   */
  TaskDto create(TaskCreateDto dto, Long currentUserId);

  /**
   * Updates an existing task.
   * Only non-null fields in the DTO are applied.
   *
   * @param id            the task ID to update
   * @param dto           the update data
   * @param currentUserId the ID of the requesting user
   * @return the updated task as a DTO
   * @throws SecurityException      if the user is not a lobby member
   * @throws NoSuchElementException if the task is not found
   */
  TaskDto update(Long id, TaskUpdateDto dto, Long currentUserId);

  /**
   * Deletes a task by its unique identifier.
   *
   * @param id            the task ID to delete
   * @param currentUserId the ID of the requesting user
   * @throws SecurityException      if the user is not a lobby member
   * @throws NoSuchElementException if the task is not found
   */
  void delete(Long id, Long currentUserId);

  /**
   * Lists tasks with optional filtering by lobby, assignee, and status.
   * All filter parameters are optional — omitting one means no filter on that field.
   *
   * @param lobbyId    the lobby ID to filter by, or null for all lobbies
   * @param assigneeId the assignee user ID to filter by, or null for all assignees
   * @param status     the task status to filter by (e.g. "TO DO", "DONE"), or null for all statuses
   * @return a list of matching tasks
   */
  List<TaskDto> list(Long lobbyId, Long assigneeId, String status);

}
