package io.backend.lined.user.api;

import java.time.OffsetDateTime;
import java.util.Set;

public record UserDto(
    long id,
    String username,
    String email,
    OffsetDateTime createdAt,
    Set<String> roles,
    String activePlan,
    OffsetDateTime activeUntil
) {
}