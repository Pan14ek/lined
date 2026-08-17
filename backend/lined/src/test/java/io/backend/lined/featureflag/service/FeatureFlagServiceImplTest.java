package io.backend.lined.featureflag.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.backend.lined.featureflag.domain.FeatureFlagEntity;
import io.backend.lined.featureflag.domain.FeatureFlagEnvironment;
import io.backend.lined.featureflag.domain.FeatureFlagKey;
import io.backend.lined.featureflag.domain.FeatureFlagRepository;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class FeatureFlagServiceImplTest {

  @Mock
  private FeatureFlagRepository repository;

  private FeatureFlagSnapshot snapshot;
  private FeatureFlagService service;

  @BeforeEach
  void setUp() {
    snapshot = new FeatureFlagSnapshot();
    service = new FeatureFlagServiceImpl(repository,
        new FeatureFlagProperties(FeatureFlagEnvironment.LOCAL, Duration.ofMinutes(30)), snapshot);
  }

  @Test
  void refresh_replacesTheEmptySnapshotWithActiveEnvironmentRows() {
    when(repository.findAllByEnvironment(FeatureFlagEnvironment.LOCAL))
        .thenReturn(List.of(flag(FeatureFlagKey.CALENDARS, true), flag(FeatureFlagKey.TASKS, false)));

    boolean refreshed = service.refresh();

    assertThat(refreshed).isTrue();
    assertThat(service.isEnabled(FeatureFlagKey.CALENDARS.value())).isTrue();
    assertThat(service.isEnabled(FeatureFlagKey.TASKS.value())).isFalse();
    verify(repository).findAllByEnvironment(FeatureFlagEnvironment.LOCAL);
  }

  @Test
  void refresh_preservesPriorSnapshotWhenRepositoryFails() {
    snapshot.replaceAll(java.util.Map.of(FeatureFlagKey.CALENDARS.value(), true));
    when(repository.findAllByEnvironment(FeatureFlagEnvironment.LOCAL))
        .thenThrow(new IllegalStateException("database unavailable"));

    boolean refreshed = service.refresh();

    assertThat(refreshed).isFalse();
    assertThat(service.isEnabled(FeatureFlagKey.CALENDARS.value())).isTrue();
  }

  @Test
  void publicFlags_containsOnlyTheApprovedCatalog() {
    snapshot.replaceAll(java.util.Map.of(
        FeatureFlagKey.CALENDARS.value(), true,
        "internal.feature.enabled", true));

    assertThat(service.publicFlags())
        .containsOnlyKeys(java.util.Arrays.stream(FeatureFlagKey.values())
            .map(FeatureFlagKey::value).toArray(String[]::new))
        .containsEntry(FeatureFlagKey.CALENDARS.value(), true)
        .containsEntry(FeatureFlagKey.TASKS.value(), false);
  }

  private FeatureFlagEntity flag(FeatureFlagKey key, boolean enabled) {
    return FeatureFlagEntity.builder()
        .key(key)
        .environment(FeatureFlagEnvironment.LOCAL)
        .enabled(enabled)
        .description(key.value())
        .updatedBy("system")
        .build();
  }
}
