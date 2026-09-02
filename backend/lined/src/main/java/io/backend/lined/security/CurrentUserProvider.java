package io.backend.lined.security;

/**
 * Provides the authenticated Lined user for the current request.
 *
 * <p>Implementations own transport-specific identity resolution. Application services should
 * depend on this narrow contract instead of reading Spring Security state directly.</p>
 */
public interface CurrentUserProvider {

  /**
   * Returns the positive persisted ID of the authenticated user.
   *
   * @return authenticated Lined user ID
   */
  long requireUserId();
}
