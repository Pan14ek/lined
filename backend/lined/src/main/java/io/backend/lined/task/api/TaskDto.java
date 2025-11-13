package io.backend.lined.task.api;

import io.backend.lined.task.domain.TaskStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Schema(name = "TaskDto")
public record TaskDto(
    @Schema(example = "555") Long id,
    @Schema(example = "Buy groceries") String title,
    @Schema(example = "TODO") TaskStatus status,
    @Schema(example = "101") Long lobbyId,
    @Schema(example = "42") Long creatorId,
    @Schema(example = "77") Long assigneeId,
    @Schema(example = "2025-11-20") LocalDate dueDate,
    @Schema(example = "2025-11-13T10:00:00Z") OffsetDateTime createdAt
) {
}
