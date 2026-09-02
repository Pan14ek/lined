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
}
