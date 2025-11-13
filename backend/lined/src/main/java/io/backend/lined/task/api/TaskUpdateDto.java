package io.backend.lined.task.api;

import io.backend.lined.task.domain.TaskStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;

@Schema(name = "TaskUpdateDto")
public record TaskUpdateDto(
    @Schema(example = "IN_PROGRESS") TaskStatus status,
    @Schema(example = "77") Long assigneeId,
    @Schema(example = "2025-11-25") LocalDate dueDate,
    @Schema(example = "Update title") String title
) {
}
