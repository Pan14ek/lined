package io.backend.lined.role.api;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.Set;

public record AssignRolesRequestDto(@NotEmpty Set<@Size(min = 4, max = 50) String> roles) {
}
