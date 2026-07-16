package io.backend.lined.task.api;

import io.backend.lined.task.domain.TaskPriority;
import io.backend.lined.task.domain.TaskStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

@Schema(name = "TaskCreateDto")
public record TaskCreateDto(
    @Schema(example = "Buy groceries") @NotBlank String title,
    @Schema(example = "101") @NotNull Long lobbyId,
    @Schema(example = "77") Long assigneeId,
    @Schema(example = "2025-11-20") LocalDate dueDate,
    @Schema(example = "Pick up milk and bread") @Size(max = 1000) String description,
    @Schema(example = "MEDIUM") TaskPriority priority,
    @Schema(example = "TODO") TaskStatus status
) {
}
