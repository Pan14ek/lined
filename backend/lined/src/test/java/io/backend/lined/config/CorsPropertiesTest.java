package io.backend.lined.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import java.util.List;
import org.junit.jupiter.api.Test;

class CorsPropertiesTest {

  @Test
  void constructor_normalizesExplicitOrigins() {
    CorsProperties properties = new CorsProperties(true,
        List.of(" https://app.lined.test ", "https://app.lined.test"), false);

    assertThat(properties.allowedOrigins()).containsExactly("https://app.lined.test");
  }

  @Test
  void constructor_rejectsWildcardOrigin() {
    assertThatIllegalArgumentException().isThrownBy(
        () -> new CorsProperties(true, List.of("*"), false));
  }

  @Test
  void constructor_rejectsInvalidOrigin() {
    assertThatIllegalArgumentException().isThrownBy(
        () -> new CorsProperties(true, List.of("https://app.lined.test/path"), false));
  }

  @Test
  void constructor_rejectsUnsupportedOriginScheme() {
    assertThatIllegalArgumentException().isThrownBy(
        () -> new CorsProperties(true, List.of("ftp://app.lined.test"), false));
  }

  @Test
  void constructor_requiresHttpsWhenConfiguredForProduction() {
    assertThatIllegalArgumentException().isThrownBy(
        () -> new CorsProperties(true, List.of("http://localhost:5173"), true));
  }
}
