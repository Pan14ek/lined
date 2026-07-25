package io.backend.lined.task.api;

import io.backend.lined.task.domain.TaskPriority;
import io.backend.lined.task.domain.TaskStatus;
import io.backend.lined.task.domain.TaskVisibility;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/**
 * Partial task update payload, including creator-only visibility changes.
 *
 * <p>For example, a shared task assigned to another member must include the creator's assignee ID
 * in the same request when its visibility becomes {@code PRIVATE}.</p>
 */
@Schema(name = "TaskUpdateDto")
public record TaskUpdateDto(
    @Schema(example = "IN_PROGRESS") TaskStatus status,
    @Schema(example = "77") Long assigneeId,
    @Schema(example = "2025-11-25") LocalDate dueDate,
    @Schema(example = "Update title") String title,
    @Schema(example = "Pick up milk and bread") @Size(max = 1000) String description,
    @Schema(example = "HIGH") TaskPriority priority,
    @Schema(example = "PRIVATE") TaskVisibility visibility
) {
  /**
   * Preserves existing partial-update call sites and leaves visibility unchanged.
   *
   * <p>For example, a status-only update continues to update only status instead of accidentally
   * converting the task to a private one.</p>
   */
  public TaskUpdateDto(TaskStatus status, Long assigneeId, LocalDate dueDate, String title,
                       String description, TaskPriority priority) {
    this(status, assigneeId, dueDate, title, description, priority, null);
  }
}
