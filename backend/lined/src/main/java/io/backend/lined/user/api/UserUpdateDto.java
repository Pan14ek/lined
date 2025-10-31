package io.backend.lined.user.api;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import java.util.Set;

public record UserUpdateDto(
    @Size(max = 64) String username,
    @Email @Size(max = 255) String email,
    @Size(max = 255) String password,
    Set<String> roles
) {
}
