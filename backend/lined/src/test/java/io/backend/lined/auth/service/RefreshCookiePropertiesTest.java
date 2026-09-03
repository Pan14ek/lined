package io.backend.lined.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import org.junit.jupiter.api.Test;

class RefreshCookiePropertiesTest {

  @Test
  void constructor_normalizesApprovedSameSiteValue() {
    RefreshCookieProperties properties = new RefreshCookieProperties(
        "lined_refresh", true, "strict", "/api/auth", false);

    assertThat(properties.sameSite()).isEqualTo("Strict");
  }

  @Test
  void constructor_rejectsCrossSiteCookieConfiguration() {
    assertThatIllegalArgumentException().isThrownBy(() -> new RefreshCookieProperties(
        "lined_refresh", true, "None", "/api/auth", false));
  }

  @Test
  void constructor_rejectsInvalidCookieNameAndPath() {
    assertThatIllegalArgumentException().isThrownBy(() -> new RefreshCookieProperties(
        "lined refresh", true, "Lax", "/api/auth", false));
    assertThatIllegalArgumentException().isThrownBy(() -> new RefreshCookieProperties(
        "lined_refresh", true, "Lax", "api/auth", false));
  }

  @Test
  void constructor_rejectsInsecureCookieWhenSecureTransportIsRequired() {
    assertThatIllegalArgumentException().isThrownBy(() -> new RefreshCookieProperties(
        "lined_refresh", false, "Lax", "/api/auth", true));
  }
}
