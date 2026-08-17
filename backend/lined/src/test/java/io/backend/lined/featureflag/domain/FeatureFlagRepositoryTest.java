package io.backend.lined.featureflag.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;

@DataJpaTest(properties = "spring.sql.init.mode=never")
class FeatureFlagRepositoryTest {

  @Autowired
  private FeatureFlagRepository repository;

  @Test
  void findAllByEnvironment_returnsOnlyRequestedEnvironmentRows() {
    repository.save(flag(FeatureFlagKey.CALENDARS, FeatureFlagEnvironment.LOCAL));
    repository.save(flag(FeatureFlagKey.TASKS, FeatureFlagEnvironment.TEST));

    assertThat(repository.findAllByEnvironment(FeatureFlagEnvironment.LOCAL))
        .extracting(FeatureFlagEntity::getKey)
        .containsExactly(FeatureFlagKey.CALENDARS.value());
  }

  @Test
  void save_rejectsDuplicateKeyAndEnvironment() {
    repository.saveAndFlush(flag(FeatureFlagKey.CALENDARS, FeatureFlagEnvironment.LOCAL));

    assertThatThrownBy(() -> repository.saveAndFlush(
        flag(FeatureFlagKey.CALENDARS, FeatureFlagEnvironment.LOCAL)))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  private FeatureFlagEntity flag(FeatureFlagKey key, FeatureFlagEnvironment environment) {
    return FeatureFlagEntity.builder()
        .key(key.value())
        .environment(environment)
        .enabled(true)
        .description(key.value())
        .updatedBy("test")
        .build();
  }
}
