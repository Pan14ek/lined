package io.backend.lined.event.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.backend.lined.common.exception.BadRequestException;
import java.time.OffsetDateTime;
import org.junit.jupiter.api.Test;

class CalendarTimeWindowTest {

  private static final String MESSAGE = "Invalid time window";
  private final OffsetDateTime base = OffsetDateTime.parse("2026-01-01T10:00:00Z");

  @Test
  void of_acceptsValidWindow() {
    var window = CalendarTimeWindow.of(base, base.plusHours(1), MESSAGE);

    assertThat(window.start()).isEqualTo(base);
    assertThat(window.end()).isEqualTo(base.plusHours(1));
  }

  @Test
  void of_throwsBadRequest_whenStartIsNull() {
    assertThatThrownBy(() -> CalendarTimeWindow.of(null, base.plusHours(1), MESSAGE))
        .isInstanceOf(BadRequestException.class)
        .hasMessageContaining(MESSAGE);
  }

  @Test
  void of_throwsBadRequest_whenEndIsNull() {
    assertThatThrownBy(() -> CalendarTimeWindow.of(base, null, MESSAGE))
        .isInstanceOf(BadRequestException.class)
        .hasMessageContaining(MESSAGE);
  }

  @Test
  void of_throwsBadRequest_whenStartEqualsEnd() {
    assertThatThrownBy(() -> CalendarTimeWindow.of(base, base, MESSAGE))
        .isInstanceOf(BadRequestException.class)
        .hasMessageContaining(MESSAGE);
  }

  @Test
  void of_throwsBadRequest_whenStartIsAfterEnd() {
    assertThatThrownBy(() -> CalendarTimeWindow.of(base.plusHours(1), base, MESSAGE))
        .isInstanceOf(BadRequestException.class)
        .hasMessageContaining(MESSAGE);
  }

  @Test
  void overlaps_returnsFalse_whenWindowsAreAdjacent() {
    var first = CalendarTimeWindow.of(base, base.plusHours(1), MESSAGE);
    var second = CalendarTimeWindow.of(base.plusHours(1), base.plusHours(2), MESSAGE);

    assertThat(first.overlaps(second)).isFalse();
    assertThat(second.overlaps(first)).isFalse();
    assertThat(first.overlapWith(second)).isEmpty();
  }

  @Test
  void overlapWith_returnsBoundsForPartialOverlap() {
    var first = CalendarTimeWindow.of(base, base.plusHours(2), MESSAGE);
    var second = CalendarTimeWindow.of(base.plusHours(1), base.plusHours(3), MESSAGE);

    var overlap = first.overlapWith(second).orElseThrow();

    assertThat(overlap.start()).isEqualTo(base.plusHours(1));
    assertThat(overlap.end()).isEqualTo(base.plusHours(2));
  }

  @Test
  void overlapWith_returnsContainedWindowBounds() {
    var outer = CalendarTimeWindow.of(base, base.plusHours(4), MESSAGE);
    var inner = CalendarTimeWindow.of(base.plusHours(1), base.plusHours(2), MESSAGE);

    var overlap = outer.overlapWith(inner).orElseThrow();

    assertThat(overlap).isEqualTo(inner);
  }

  @Test
  void overlapWith_returnsSameWindowBounds() {
    var first = CalendarTimeWindow.of(base, base.plusHours(1), MESSAGE);
    var second = CalendarTimeWindow.of(base, base.plusHours(1), MESSAGE);

    var overlap = first.overlapWith(second).orElseThrow();

    assertThat(overlap).isEqualTo(first);
  }
}
