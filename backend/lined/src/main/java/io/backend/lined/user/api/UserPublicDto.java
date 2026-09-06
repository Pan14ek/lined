package io.backend.lined.user.api;

import io.swagger.v3.oas.annotations.media.Schema;

/** Minimal projection for a user another authenticated caller may discover. */
@Schema(name = "UserPublicDto", description = "Minimal directory representation of a user")
public record UserPublicDto(
    @Schema(description = "Unique user id", example = "42") long id,
    @Schema(description = "Login name", example = "pan14ek") String username
) {
}
