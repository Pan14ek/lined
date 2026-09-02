package io.backend.lined.auth.api;

public record AuthLoginResponseDto(
    String accessToken,
    String tokenType,
    long expiresIn
) {
}
