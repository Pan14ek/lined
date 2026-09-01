package io.backend.lined.integration.featureflag;

import static org.assertj.core.api.Assertions.assertThat;

import io.backend.lined.featureflag.domain.FeatureFlagKey;
import io.backend.lined.integration.AbstractApiIntegrationTest;
import org.junit.jupiter.api.Test;

class FeatureFlagSeedSchemaIT extends AbstractApiIntegrationTest {

  @Test
  void seedsTestFlagsWithInitialOptimisticLockVersion() {
    Integer seededCount = jdbcTemplate.queryForObject(
        "select count(*) from feature_flags where environment = 'TEST' and version = 0", Integer.class);

    assertThat(seededCount).isEqualTo(FeatureFlagKey.values().length);
  }
}
