package io.backend.lined.user.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;
import java.util.Set;

@Schema(name = "UserSearchResultDto", description = "Lightweight user search result")
public record UserSearchResultDto(
    @Schema(description = "Unique user id") long id,
    @Schema(description = "Login name") String username,
    @Schema(description = "Email address") String email,
    @Schema(description = "Creation timestamp") OffsetDateTime createdAt,
    @Schema(description = "Assigned roles") Set<String> roles
) {}
