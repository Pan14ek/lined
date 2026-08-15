package io.backend.lined.common.metrics;

import static org.assertj.core.api.Assertions.assertThat;

import io.backend.lined.event.domain.EventVisibility;
import io.backend.lined.task.domain.TaskVisibility;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.util.List;
import java.util.Objects;
import org.junit.jupiter.api.Test;

class PrivateItemMetricsTest {

  @Test
  void recordsOnlyFixedPrivacyMetricNamesAndTags() {
    SimpleMeterRegistry registry = new SimpleMeterRegistry();
    var metrics = new PrivateItemMetrics(registry);

    metrics.recordPrivateItemCreated(PrivateItemType.EVENT);
    metrics.recordAccessDenied(PrivateItemType.TASK);
    metrics.recordVisibilityChange(PrivateItemType.EVENT, EventVisibility.SHARED,
        EventVisibility.PRIVATE);

    assertThat(counter(registry, PrivateItemMetrics.CREATED_METRIC, "item.type", "event").count())
        .isEqualTo(1.0);
    assertThat(counter(registry, PrivateItemMetrics.ACCESS_DENIED_METRIC, "item.type", "task")
        .count()).isEqualTo(1.0);
    assertThat(counter(registry, PrivateItemMetrics.VISIBILITY_CHANGE_METRIC, "item.type", "event",
        "from", "SHARED", "to", "PRIVATE").count()).isEqualTo(1.0);
    assertThat(registry.getMeters()).allSatisfy(meter -> assertThat(meter.getId().getTags())
        .allSatisfy(tag -> assertThat(List.of("event", "task", "PRIVATE", "SHARED"))
            .contains(tag.getValue())));
  }

  @Test
  void recordsTaskVisibilityTransitionWithTaskVisibilityEnum() {
    SimpleMeterRegistry registry = new SimpleMeterRegistry();
    var metrics = new PrivateItemMetrics(registry);

    metrics.recordVisibilityChange(PrivateItemType.TASK, TaskVisibility.PRIVATE,
        TaskVisibility.SHARED);

    assertThat(counter(registry, PrivateItemMetrics.VISIBILITY_CHANGE_METRIC, "item.type", "task",
        "from", "PRIVATE", "to", "SHARED").count()).isEqualTo(1.0);
  }

  private Counter counter(SimpleMeterRegistry registry, String metric, String... tags) {
    return Objects.requireNonNull(registry.find(metric).tags(tags).counter());
  }
}
