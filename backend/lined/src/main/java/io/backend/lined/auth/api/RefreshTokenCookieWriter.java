package io.backend.lined.auth.api;

import io.backend.lined.auth.service.RefreshCookieProperties;
import io.backend.lined.auth.service.RefreshSessionProperties;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

/** Writes the web-only raw refresh credential using Lined's approved cookie transport. */
@Component
@RequiredArgsConstructor
public class RefreshTokenCookieWriter {

  private final RefreshCookieProperties cookieProperties;
  private final RefreshSessionProperties sessionProperties;

  /**
   * Adds the initial session cookie without exposing the credential in a JSON response body.
   *
   * @param response servlet response carrying the Set-Cookie header
   * @param refreshToken raw opaque credential issued only for this response
   */
  public void write(HttpServletResponse response, String refreshToken) {
    ResponseCookie cookie = ResponseCookie.from(cookieProperties.refreshName(), refreshToken)
        .httpOnly(true)
        .secure(cookieProperties.secure())
        .sameSite(cookieProperties.sameSite())
        .path(cookieProperties.path())
        .maxAge(sessionProperties.refreshIdleTimeout())
        .build();
    response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
  }
}
