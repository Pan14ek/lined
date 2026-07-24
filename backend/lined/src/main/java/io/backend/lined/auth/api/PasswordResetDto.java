package io.backend.lined.auth.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request payload for redeeming one opaque, time-limited password-reset token.
 *
 * <p>For example, a user who receives {@code AbCdEf...} out of band submits
 * {@code new PasswordResetDto("AbCdEf...", "N3wP@ssword!")}. The token is not a Bearer session
 * credential: it can be used once only and is rejected with the same generic response when it is
 * unknown, expired, or already redeemed.</p>
 *
 * @param token non-blank raw reset token received through the out-of-band delivery channel
 * @param newPassword non-blank replacement password, at most 255 characters long
 */
public record PasswordResetDto(
    @NotBlank String token,
    @NotBlank @Size(max = 255) String newPassword
) {
}
