package io.backend.lined.auth.api;

import static org.assertj.core.api.Assertions.assertThat;

import io.backend.lined.auth.service.RefreshCookieProperties;
import jakarta.servlet.http.Cookie;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

class RefreshTokenCookieReaderTest {

  private final RefreshTokenCookieReader reader = new RefreshTokenCookieReader(
      new RefreshCookieProperties("lined_refresh", true, "Lax", "/api/auth", false));

  @Test
  void read_returnsConfiguredNonBlankCookieValue() {
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.setCookies(new Cookie("other", "ignored"), new Cookie("lined_refresh", "opaque"));

    assertThat(reader.read(request)).isEqualTo(Optional.of("opaque"));
  }

  @Test
  void read_returnsEmptyWhenCookieIsMissingOrBlank() {
    MockHttpServletRequest missing = new MockHttpServletRequest();
    MockHttpServletRequest blank = new MockHttpServletRequest();
    blank.setCookies(new Cookie("lined_refresh", " "));

    assertThat(reader.read(missing)).isEmpty();
    assertThat(reader.read(blank)).isEmpty();
  }
}
