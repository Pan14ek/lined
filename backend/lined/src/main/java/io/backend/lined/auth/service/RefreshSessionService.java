package io.backend.lined.auth.service;

/** Creates the first opaque refresh credential for each successful authentication. */
public interface RefreshSessionService {

  /**
   * Creates an independently revocable session for one authenticated user.
   *
   * @param userId authenticated persisted user identifier
   * @return transient raw credential and persisted session metadata
   */
  IssuedRefreshSession createSession(long userId);

  /**
   * Atomically consumes a presented credential and creates its one successor.
   *
   * @param refreshToken raw opaque credential from the transport adapter
   * @return authenticated user ID and transient successor credential
   */
  RotatedRefreshSession refresh(String refreshToken);

  /**
   * Revokes the session identified by a refresh credential without revealing token state.
   *
   * @param refreshToken raw opaque credential from the transport adapter
   */
  void logout(String refreshToken);
}
