package io.backend.lined.auth.api;

import io.backend.lined.auth.service.RefreshCookieProperties;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Arrays;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Reads the configured opaque refresh credential from the web cookie transport. */
@Component
@RequiredArgsConstructor
public class RefreshTokenCookieReader {

  private final RefreshCookieProperties cookieProperties;

  /**
   * Finds the configured refresh cookie without logging or otherwise retaining its value.
   *
   * @param request servlet request carrying browser cookies
   * @return present non-blank credential, or empty when the request has none
   */
  public Optional<String> read(HttpServletRequest request) {
    if (request.getCookies() == null) {
      return Optional.empty();
    }
    return Arrays.stream(request.getCookies())
        .filter(cookie -> cookieProperties.refreshName().equals(cookie.getName()))
        .map(Cookie::getValue)
        .filter(value -> value != null && !value.isBlank())
        .findFirst();
  }
}
