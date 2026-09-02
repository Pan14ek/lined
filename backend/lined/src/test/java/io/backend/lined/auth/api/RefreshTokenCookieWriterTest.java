package io.backend.lined.auth.api;

import static org.assertj.core.api.Assertions.assertThat;

import io.backend.lined.auth.service.RefreshCookieProperties;
import io.backend.lined.auth.service.RefreshSessionProperties;
import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockHttpServletResponse;

class RefreshTokenCookieWriterTest {

  @Test
  void write_setsApprovedHttpOnlyRefreshCookieAttributes() {
    RefreshTokenCookieWriter writer = new RefreshTokenCookieWriter(
        new RefreshCookieProperties("lined_refresh", true, "Lax", "/api/auth"),
        new RefreshSessionProperties(Duration.ofDays(7), Duration.ofDays(30)));
    MockHttpServletResponse response = new MockHttpServletResponse();

    writer.write(response, "opaque-refresh-token");

    String cookie = response.getHeader(HttpHeaders.SET_COOKIE);
    assertThat(cookie)
        .contains("lined_refresh=opaque-refresh-token", "Max-Age=604800",
            "Path=/api/auth", "Secure", "HttpOnly", "SameSite=Lax")
        .doesNotContain("Domain=");
  }
}
