package io.backend.lined.task.service;

import io.backend.lined.common.exception.ForbiddenException;
import io.backend.lined.common.exception.NotFoundException;
import io.backend.lined.task.domain.TaskEntity;
import io.backend.lined.task.domain.TaskVisibility;
import org.springframework.stereotype.Component;

/**
 * Enforces creator-only privacy rules after the caller's lobby membership has been checked.
 *
 * <p>For example, user {@code 77} requesting private task {@code 555} created by user
 * {@code 42} receives the same {@code 404} response as for an unknown task. User {@code 77}
 * may still work with a shared task when the normal lobby write policy allows it.</p>
 */
@Component
public class TaskAccessPolicy {

  /**
   * Ensures that a requester may read the task without confirming another creator's private task.
   *
   * @param task task being read
   * @param requesterId caller identity
   * @throws NotFoundException when a non-creator requests a private task
   */
  public void ensureCanRead(TaskEntity task, Long requesterId) {
    if (!isVisibleTo(task, requesterId)) {
      throw privateTaskNotFound(task.getId());
    }
  }

  /**
   * Ensures that a requester may mutate the task under the private-task boundary.
   *
   * <p>For example, this rejects user {@code 77} changing a private task created by user
   * {@code 42}; shared-task authorization remains the responsibility of the lobby policy.</p>
   *
   * @param task task being changed
   * @param requesterId caller identity
   */
  public void ensureCanMutate(TaskEntity task, Long requesterId) {
    ensureCanRead(task, requesterId);
  }

  /**
   * Ensures that only a task creator changes visibility.
   *
   * <p>A non-creator receives {@code 403} for a visible shared task. A private task remains
   * hidden and therefore produces {@code 404} before this owner-only check.</p>
   *
   * @param task task whose visibility is changing
   * @param requesterId caller identity
   * @throws ForbiddenException when a non-creator changes a shared task's visibility
   */
  public void ensureCanChangeVisibility(TaskEntity task, Long requesterId) {
    ensureCanRead(task, requesterId);
    if (!task.getCreator().getId().equals(requesterId)) {
      throw new ForbiddenException("Only the task creator can change visibility");
    }
  }

  /**
   * Returns whether a task may be represented to a requester.
   *
   * <p>Shared tasks are visible here; callers must additionally enforce the existing lobby
   * membership rule. Private tasks are visible only when requester and creator have the same ID.</p>
   *
   * @param task candidate task
   * @param requesterId caller identity
   * @return {@code true} for shared tasks or the private task's creator
   */
  public boolean isVisibleTo(TaskEntity task, Long requesterId) {
    return task.getVisibility() == TaskVisibility.SHARED
        || task.getCreator().getId().equals(requesterId);
  }

  private NotFoundException privateTaskNotFound(Long taskId) {
    return new NotFoundException("Task %d not found".formatted(taskId));
  }
}
