package io.backend.lined.auth.service;

import io.backend.lined.auth.api.AuthLoginDto;

public interface AuthService {

  AuthLoginResult login(AuthLoginDto dto);

  /**
   * Rotates the current opaque refresh credential and issues a new access token.
   *
   * @param refreshToken raw credential supplied by the transport adapter
   * @return access-token response and transient successor credential
   */
  AuthLoginResult refresh(String refreshToken);
}
