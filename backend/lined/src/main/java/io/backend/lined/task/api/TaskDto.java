package io.backend.lined.task.api;

import io.backend.lined.task.domain.TaskPriority;
import io.backend.lined.task.domain.TaskStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Schema(name = "TaskDto")
public record TaskDto(
    @Schema(example = "555") Long id,
    @Schema(example = "0", description = "Optimistic-lock version") long version,
    @Schema(example = "Buy groceries") String title,
    @Schema(example = "Pick up milk and bread") String description,
    @Schema(example = "MEDIUM") TaskPriority priority,
    @Schema(example = "TODO") TaskStatus status,
    @Schema(example = "101") Long lobbyId,
    @Schema(example = "42") Long creatorId,
    @Schema(example = "77") Long assigneeId,
    @Schema(example = "2025-11-20") LocalDate dueDate,
    @Schema(example = "2025-11-13T10:00:00Z") OffsetDateTime createdAt
) {
}
