package io.backend.lined.task.api;

import io.backend.lined.task.domain.TaskPriority;
import io.backend.lined.task.domain.TaskStatus;
import io.backend.lined.task.domain.TaskVisibility;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;
import java.time.OffsetDateTime;

/**
 * Requester-visible representation of a task.
 *
 * <p>For example, a private response is emitted only to its creator and reports
 * {@code visibility=PRIVATE}; it is omitted for other lobby members.</p>
 */
@Schema(name = "TaskDto")
public record TaskDto(
    @Schema(example = "555") Long id,
    @Schema(example = "0", description = "Optimistic-lock version") long version,
    @Schema(example = "Buy groceries") String title,
    @Schema(example = "Pick up milk and bread") String description,
    @Schema(example = "MEDIUM") TaskPriority priority,
    @Schema(example = "TODO") TaskStatus status,
    @Schema(example = "SHARED") TaskVisibility visibility,
    @Schema(example = "101") Long lobbyId,
    @Schema(example = "42") Long creatorId,
    @Schema(example = "77") Long assigneeId,
    @Schema(example = "2025-11-20") LocalDate dueDate,
    @Schema(example = "2025-11-13T10:00:00Z") OffsetDateTime createdAt
) {
}
