package io.backend.lined.event.service;

import io.backend.lined.event.api.FreeSlotDto;
import io.backend.lined.event.domain.EventEntity;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

/**
 * Calculates the free portions of a requested calendar window without exposing event details.
 */
@Component
public class FreeSlotCalculator {

  /**
   * Returns the requested time window minus all supplied busy-event windows.
   *
   * @param queryWindow validated requested window
   * @param busyEvents events ordered by start time that make at least one lobby member unavailable
   * @return ordered free windows using half-open interval semantics
   */
  public List<FreeSlotDto> findFreeSlots(CalendarTimeWindow queryWindow,
                                         List<EventEntity> busyEvents) {
    List<FreeSlotDto> freeSlots = new ArrayList<>();
    OffsetDateTime cursor = queryWindow.start();
    for (var busyEvent : busyEvents) {
      var busyWindow = clippedTo(windowOf(busyEvent), queryWindow);
      if (cursor.isBefore(busyWindow.start())) {
        freeSlots.add(new FreeSlotDto(cursor, busyWindow.start()));
      }
      if (cursor.isBefore(busyWindow.end())) {
        cursor = busyWindow.end();
      }
    }
    if (cursor.isBefore(queryWindow.end())) {
      freeSlots.add(new FreeSlotDto(cursor, queryWindow.end()));
    }
    return freeSlots;
  }

  private CalendarTimeWindow clippedTo(CalendarTimeWindow window, CalendarTimeWindow bounds) {
    OffsetDateTime start = window.start().isAfter(bounds.start()) ? window.start() : bounds.start();
    OffsetDateTime end = window.end().isBefore(bounds.end()) ? window.end() : bounds.end();
    return new CalendarTimeWindow(start, end);
  }

  private CalendarTimeWindow windowOf(EventEntity event) {
    if (event.getStartAt() == null || event.getEndAt() == null
        || !event.getStartAt().isBefore(event.getEndAt())) {
      throw new IllegalStateException(
          "Stored event %d has invalid time window".formatted(event.getId()));
    }
    return new CalendarTimeWindow(event.getStartAt(), event.getEndAt());
  }
}
