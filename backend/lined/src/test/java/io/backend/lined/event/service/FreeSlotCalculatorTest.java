package io.backend.lined.event.service;

import static org.assertj.core.api.Assertions.assertThat;

import io.backend.lined.event.api.FreeSlotDto;
import io.backend.lined.event.domain.EventEntity;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class FreeSlotCalculatorTest {

  private FreeSlotCalculator calculator;
  private OffsetDateTime start;
  private OffsetDateTime end;

  @BeforeEach
  void setUp() {
    calculator = new FreeSlotCalculator();
    start = OffsetDateTime.parse("2026-01-01T09:00:00Z");
    end = OffsetDateTime.parse("2026-01-01T17:00:00Z");
  }

  @Test
  void findFreeSlots_returnsWholeWindow_whenNoBusyEvents() {
    List<FreeSlotDto> result = calculator.findFreeSlots(window(), List.of());

    assertThat(result).containsExactly(new FreeSlotDto(start, end));
  }

  @Test
  void findFreeSlots_clipsAndMergesOverlappingBusyEvents() {
    var first = event(start.minusHours(1), start.plusHours(2));
    var second = event(start.plusHours(1), start.plusHours(4));
    var third = event(end.minusHours(2), end.plusHours(1));

    List<FreeSlotDto> result = calculator.findFreeSlots(window(), List.of(first, second, third));

    assertThat(result).containsExactly(new FreeSlotDto(start.plusHours(4), end.minusHours(2)));
  }

  @Test
  void findFreeSlots_mergesTouchingBusyEvents() {
    var first = event(start.plusHours(1), start.plusHours(3));
    var second = event(start.plusHours(3), start.plusHours(5));

    List<FreeSlotDto> result = calculator.findFreeSlots(window(), List.of(first, second));

    assertThat(result).containsExactly(
        new FreeSlotDto(start, start.plusHours(1)),
        new FreeSlotDto(start.plusHours(5), end));
  }

  @Test
  void findFreeSlots_returnsEmpty_whenBusyEventsCoverWholeWindow() {
    var busyEvent = event(start.minusHours(1), end.plusHours(1));

    List<FreeSlotDto> result = calculator.findFreeSlots(window(), List.of(busyEvent));

    assertThat(result).isEmpty();
  }

  private CalendarTimeWindow window() {
    return CalendarTimeWindow.of(start, end, "invalid");
  }

  private EventEntity event(OffsetDateTime eventStart, OffsetDateTime eventEnd) {
    return EventEntity.builder().id(1L).startAt(eventStart).endAt(eventEnd).build();
  }
}
