package io.backend.lined.task.api;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

@Schema(name = "TaskCreateDto")
public record TaskCreateDto(
    @Schema(example = "Buy groceries") @NotBlank String title,
    @Schema(example = "101") @NotNull Long lobbyId,
    @Schema(example = "77") Long assigneeId,
    @Schema(example = "2025-11-20") LocalDate dueDate
) {
}
