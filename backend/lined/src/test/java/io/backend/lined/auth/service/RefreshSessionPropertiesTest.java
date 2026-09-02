package io.backend.lined.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import java.time.Duration;
import org.junit.jupiter.api.Test;

class RefreshSessionPropertiesTest {

  @Test
  void constructor_acceptsConfiguredIdleAndAbsoluteTimeouts() {
    RefreshSessionProperties properties = new RefreshSessionProperties(
        Duration.ofDays(7), Duration.ofDays(30));

    assertThat(properties.refreshIdleTimeout()).isEqualTo(Duration.ofDays(7));
    assertThat(properties.absoluteTimeout()).isEqualTo(Duration.ofDays(30));
  }

  @Test
  void constructor_rejectsIdleTimeoutBeyondAbsoluteLifetime() {
    assertThatIllegalArgumentException().isThrownBy(() -> new RefreshSessionProperties(
        Duration.ofDays(31), Duration.ofDays(30)));
  }

  @Test
  void constructor_rejectsNonPositiveTimeout() {
    assertThatIllegalArgumentException().isThrownBy(() -> new RefreshSessionProperties(
        Duration.ZERO, Duration.ofDays(30)));
  }
}
