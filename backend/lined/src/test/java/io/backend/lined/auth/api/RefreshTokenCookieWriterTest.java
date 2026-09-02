package io.backend.lined.auth.api;

import static org.assertj.core.api.Assertions.assertThat;

import io.backend.lined.auth.service.RefreshCookieProperties;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockHttpServletResponse;

class RefreshTokenCookieWriterTest {

  @Test
  void write_setsApprovedHttpOnlyRefreshCookieAttributes() {
    RefreshTokenCookieWriter writer = new RefreshTokenCookieWriter(
        new RefreshCookieProperties("lined_refresh", true, "Lax", "/api/auth"),
        Clock.fixed(Instant.parse("2026-09-02T10:15:30Z"), ZoneOffset.UTC));
    MockHttpServletResponse response = new MockHttpServletResponse();

    writer.write(response, "opaque-refresh-token", Instant.parse("2026-09-09T10:15:30Z")
        .atOffset(ZoneOffset.UTC));

    String cookie = response.getHeader(HttpHeaders.SET_COOKIE);
    assertThat(cookie)
        .contains("lined_refresh=opaque-refresh-token", "Max-Age=604800",
            "Path=/api/auth", "Secure", "HttpOnly", "SameSite=Lax")
        .doesNotContain("Domain=");
  }

  @Test
  void clear_expiresRefreshCookieWithApprovedAttributes() {
    RefreshTokenCookieWriter writer = new RefreshTokenCookieWriter(
        new RefreshCookieProperties("lined_refresh", true, "Lax", "/api/auth"),
        Clock.fixed(Instant.parse("2026-09-02T10:15:30Z"), ZoneOffset.UTC));
    MockHttpServletResponse response = new MockHttpServletResponse();

    writer.clear(response);

    String cookie = response.getHeader(HttpHeaders.SET_COOKIE);
    assertThat(cookie)
        .contains("lined_refresh=", "Max-Age=0", "Path=/api/auth", "Secure", "HttpOnly",
            "SameSite=Lax")
        .doesNotContain("Domain=");
  }
}
