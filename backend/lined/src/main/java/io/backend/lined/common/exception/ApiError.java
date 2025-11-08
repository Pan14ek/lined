package io.backend.lined.common.exception;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;

@Schema(name = "ApiError", description = "Standard API error response")
public record ApiError(

    @Schema(example = "VALIDATION_ERROR", description = "Type or code of the error")
    String code,

    @Schema(example = "Email is invalid", description = "Human-readable error message")
    String message,

    @Schema(example = "2025-11-03T22:11:44Z", description = "Timestamp when the error occurred (ISO 8601)")
    OffsetDateTime timestamp,

    @Schema(example = "/api/users", description = "Request path where error occurred")
    String path
) {
}
