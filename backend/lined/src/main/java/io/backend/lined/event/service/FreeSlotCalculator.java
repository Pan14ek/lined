package io.backend.lined.event.service;

import io.backend.lined.event.api.FreeSlotDto;
import io.backend.lined.event.domain.EventEntity;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
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
   * @param busyEvents events that make at least one lobby member unavailable
   * @return ordered free windows using half-open interval semantics
   */
  public List<FreeSlotDto> findFreeSlots(CalendarTimeWindow queryWindow,
                                         List<EventEntity> busyEvents) {
    var mergedBusyWindows = mergeBusyWindows(queryWindow, busyEvents);
    List<FreeSlotDto> freeSlots = new ArrayList<>();
    OffsetDateTime cursor = queryWindow.start();
    for (var busyWindow : mergedBusyWindows) {
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

  private List<CalendarTimeWindow> mergeBusyWindows(CalendarTimeWindow queryWindow,
                                                     List<EventEntity> busyEvents) {
    var sortedWindows = busyEvents.stream()
        .map(this::windowOf)
        .map(window -> clippedTo(window, queryWindow))
        .flatMap(java.util.Optional::stream)
        .sorted(Comparator.comparing(CalendarTimeWindow::start))
        .toList();
    List<CalendarTimeWindow> merged = new ArrayList<>();
    for (var window : sortedWindows) {
      mergeWindow(merged, window);
    }
    return merged;
  }

  private void mergeWindow(List<CalendarTimeWindow> merged, CalendarTimeWindow next) {
    if (merged.isEmpty() || next.start().isAfter(merged.get(merged.size() - 1).end())) {
      merged.add(next);
      return;
    }
    int lastIndex = merged.size() - 1;
    var previous = merged.get(lastIndex);
    OffsetDateTime mergedEnd = previous.end().isAfter(next.end()) ? previous.end() : next.end();
    merged.set(lastIndex, new CalendarTimeWindow(previous.start(), mergedEnd));
  }

  private java.util.Optional<CalendarTimeWindow> clippedTo(CalendarTimeWindow window,
                                                            CalendarTimeWindow bounds) {
    return window.overlapWith(bounds);
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
