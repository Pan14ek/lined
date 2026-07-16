package io.backend.lined.auth.api;

import java.util.Set;

public record AuthLoginResponseDto(
    String accessToken,
    String tokenType,
    long expiresIn,
    long userId,
    String username,
    String email,
    Set<String> roles
) {
}
