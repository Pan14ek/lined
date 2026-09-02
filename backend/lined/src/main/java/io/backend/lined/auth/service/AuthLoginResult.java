package io.backend.lined.auth.service;

import io.backend.lined.auth.api.AuthLoginResponseDto;

/**
 * Transient login outcome containing the public response and its cookie-only refresh credential.
 *
 * <p>The raw refresh value is intentionally available only to the API transport adapter. Its
 * string representation redacts both credentials to prevent accidental diagnostic logging.</p>
 */
public final class AuthLoginResult {

  private final AuthLoginResponseDto response;
  private final String refreshToken;

  public AuthLoginResult(AuthLoginResponseDto response, String refreshToken) {
    this.response = response;
    this.refreshToken = refreshToken;
  }

  public AuthLoginResponseDto response() {
    return response;
  }

  public String refreshToken() {
    return refreshToken;
  }

  @Override
  public String toString() {
    return "AuthLoginResult[credentials redacted]";
  }
}
