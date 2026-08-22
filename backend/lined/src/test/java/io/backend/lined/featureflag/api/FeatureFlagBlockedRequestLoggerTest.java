package io.backend.lined.featureflag.api;

import static org.assertj.core.api.Assertions.assertThat;

import io.backend.lined.featureflag.domain.FeatureFlagKey;
import org.junit.jupiter.api.Test;

class FeatureFlagBlockedRequestLoggerTest {

  @Test
  void logBlocked_recordsEachKnownKeyOnlyOnce() {
    FeatureFlagBlockedRequestLogger logger = new FeatureFlagBlockedRequestLogger();

    logger.logBlocked(FeatureFlagKey.TASKS);
    logger.logBlocked(FeatureFlagKey.TASKS);
    logger.logBlocked(FeatureFlagKey.CALENDARS);

    assertThat(logger.hasLogged(FeatureFlagKey.TASKS)).isTrue();
    assertThat(logger.hasLogged(FeatureFlagKey.CALENDARS)).isTrue();
    assertThat(logger.hasLogged(FeatureFlagKey.LOBBIES)).isFalse();
  }
}
