package io.backend.lined.auth.api;

import io.backend.lined.auth.service.RefreshCookieProperties;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Clock;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

/** Writes the web-only raw refresh credential using Lined's approved cookie transport. */
@Component
@RequiredArgsConstructor
public class RefreshTokenCookieWriter {

  private final RefreshCookieProperties cookieProperties;
  private final Clock clock;

  /**
   * Adds a session cookie without exposing the credential in a JSON response body.
   *
   * @param response servlet response carrying the Set-Cookie header
   * @param refreshToken raw opaque credential issued only for this response
   * @param expiresAt server-side deadline for this credential
   */
  public void write(HttpServletResponse response, String refreshToken, OffsetDateTime expiresAt) {
    Duration remaining = Duration.between(
        OffsetDateTime.ofInstant(clock.instant(), ZoneOffset.UTC), expiresAt);
    ResponseCookie cookie = ResponseCookie.from(cookieProperties.refreshName(), refreshToken)
        .httpOnly(true)
        .secure(cookieProperties.secure())
        .sameSite(cookieProperties.sameSite())
        .path(cookieProperties.path())
        .maxAge(cookieMaxAge(remaining))
        .build();
    response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
  }

  private Duration cookieMaxAge(Duration remaining) {
    if (remaining.isNegative()) {
      return Duration.ZERO;
    }
    long seconds = remaining.toSeconds();
    if (!remaining.minusSeconds(seconds).isZero()) {
      seconds++;
    }
    return Duration.ofSeconds(seconds);
  }
}
