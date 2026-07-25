package io.backend.lined.task.api;

import io.backend.lined.task.domain.TaskPriority;
import io.backend.lined.task.domain.TaskStatus;
import io.backend.lined.task.domain.TaskVisibility;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/**
 * Request payload for a new shared or creator-owned private task.
 *
 * <p>For example, {@code visibility=PRIVATE} with no assignee creates a private task assigned to
 * the requester; a different assignee is rejected by the service.</p>
 */
@Schema(name = "TaskCreateDto")
public record TaskCreateDto(
    @Schema(example = "Buy groceries") @NotBlank String title,
    @Schema(example = "101") @NotNull Long lobbyId,
    @Schema(example = "77") Long assigneeId,
    @Schema(example = "2025-11-20") LocalDate dueDate,
    @Schema(example = "Pick up milk and bread") @Size(max = 1000) String description,
    @Schema(example = "MEDIUM") TaskPriority priority,
    @Schema(example = "TODO") TaskStatus status,
    @Schema(example = "SHARED") TaskVisibility visibility,
    @Schema(example = "true") boolean notifyAssignee
) {

  public TaskCreateDto(String title, Long lobbyId, Long assigneeId, LocalDate dueDate,
                       String description, TaskPriority priority, TaskStatus status) {
    this(title, lobbyId, assigneeId, dueDate, description, priority, status, null, false);
  }

}
