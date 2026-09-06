package io.backend.lined.user.api;

import io.swagger.v3.oas.annotations.media.Schema;
@Schema(name = "UserSearchResultDto", description = "Lightweight user search result")
public record UserSearchResultDto(
    @Schema(description = "Unique user id") long id,
    @Schema(description = "Login name") String username
) {
}
