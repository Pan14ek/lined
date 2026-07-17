package io.backend.lined.auth.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PasswordResetDto(
    @NotBlank String token,
    @NotBlank @Size(max = 255) String newPassword
) {
}
