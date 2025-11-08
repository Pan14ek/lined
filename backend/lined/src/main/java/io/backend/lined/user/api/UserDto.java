package io.backend.lined.user.api;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;
import java.util.Set;

@Schema(name = "UserDto", description = "Representation of a user")
public record UserDto(
    @Schema(description = "Unique user id", example = "42")
    long id,

    @Schema(description = "Login name", example = "pan14ek")
    String username,

    @Schema(description = "Email address", example = "user@example.com")
    String email,

    @Schema(description = "Creation timestamp", type = "string", format = "date-time", example = "2023-01-01T12:00:00Z")
    OffsetDateTime createdAt,

    @Schema(description = "Assigned roles", example = "[\"ROLE_USER\",\"ROLE_ADMIN\"]")
    Set<String> roles,

    @Schema(description = "Active subscription plan name", example = "pro")
    String activePlan,

    @Schema(description = "Plan expiration timestamp", type = "string", format = "date-time", example = "2024-01-01T12:00:00Z")
    OffsetDateTime activeUntil
) {
}
