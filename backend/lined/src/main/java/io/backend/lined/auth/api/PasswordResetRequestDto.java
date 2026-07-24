package io.backend.lined.auth.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request payload for beginning password recovery without an authenticated session.
 *
 * <p>The identifier may be either the account email or username. For example,
 * {@code new PasswordResetRequestDto("alex@example.com")} and
 * {@code new PasswordResetRequestDto("alex")} both ask the service to locate the same account.
 * The HTTP endpoint deliberately returns the same {@code 202 Accepted} response when neither
 * value identifies an account, so callers cannot use this payload to enumerate users.</p>
 *
 * @param identifier non-blank email address or username, at most 255 characters long
 */
public record PasswordResetRequestDto(
    @NotBlank @Size(max = 255) String identifier
) {
}
