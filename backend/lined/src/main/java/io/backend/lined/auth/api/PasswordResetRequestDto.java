package io.backend.lined.auth.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PasswordResetRequestDto(
    @NotBlank @Size(max = 255) String identifier
) {
}
