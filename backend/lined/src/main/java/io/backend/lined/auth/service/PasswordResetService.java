package io.backend.lined.auth.service;

import io.backend.lined.auth.api.PasswordResetDto;
import io.backend.lined.auth.api.PasswordResetRequestDto;

/**
 * Coordinates the signed-out password-recovery workflow.
 *
 * <p>For example, a client first calls {@link #requestReset(PasswordResetRequestDto)} with an
 * email address, then calls {@link #reset(PasswordResetDto)} with the delivered opaque token and
 * a replacement password. Neither operation requires the caller's existing password or
 * caller authentication.</p>
 */
public interface PasswordResetService {

  /**
   * Requests a reset token for an email address or username without revealing whether it exists.
   *
   * <p>For example, both {@code alex@example.com} and an unknown address return normally to the
   * controller, which responds with {@code 202 Accepted}. Only a known account receives a new
   * persisted token through the configured out-of-band delivery path.</p>
   *
   * @param dto identifier submitted by a signed-out caller
   */
  void requestReset(PasswordResetRequestDto dto);

  /**
   * Redeems one valid reset token and stores the replacement password.
   *
   * <p>For example, two concurrent calls with the same token produce one successful password
   * change and one generic invalid-token failure. A later call with that token follows the same
   * failure path, while other outstanding tokens for the user are invalidated.</p>
   *
   * @param dto raw token and replacement password submitted by the caller
   */
  void reset(PasswordResetDto dto);
}
