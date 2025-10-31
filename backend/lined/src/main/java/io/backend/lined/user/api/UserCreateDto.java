package io.backend.lined.user.api;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Set;

public record UserCreateDto(
    @NotBlank @Size(max = 64) String username,
    @NotBlank @Email @Size(max = 255) String email,
    @NotBlank @Size(max = 255) String password,
    Set<String> roles
) {
}
