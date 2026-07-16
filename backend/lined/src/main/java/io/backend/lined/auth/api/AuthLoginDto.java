package io.backend.lined.auth.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AuthLoginDto(
    @Size(max = 255) String identifier,
    @Size(max = 255) String email,
    @Size(max = 64) String username,
    @NotBlank @Size(max = 255) String password
) {

  public String resolvedIdentifier() {
    if (hasText(identifier)) {
      return identifier.trim();
    }
    if (hasText(email)) {
      return email.trim();
    }
    if (hasText(username)) {
      return username.trim();
    }
    return null;
  }

  private boolean hasText(String value) {
    return value != null && !value.isBlank();
  }
}
