package io.backend.lined.event.service;

import io.backend.lined.event.api.EventConflictDto;
import io.backend.lined.event.api.EventMapper;
import io.backend.lined.event.domain.EventEntity;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Finds overlapping event pairs and maps them into calendar conflict responses.
 */
@Component
@RequiredArgsConstructor
public class EventConflictAnalyzer {

  private final EventMapper mapper;

  /**
   * Finds all pairwise conflicts in the supplied event order.
   *
   * @param events events that already match the scheduling search window
   * @return conflict pairs with calculated overlap bounds
   */
  public List<EventConflictDto> findConflicts(List<EventEntity> events) {
    var windows = events.stream().map(this::windowOf).toList();
    List<EventConflictDto> conflicts = new ArrayList<>();
    for (int i = 0; i < events.size(); i++) {
      for (int j = i + 1; j < events.size(); j++) {
        addConflict(events.get(i), windows.get(i), events.get(j), windows.get(j), conflicts);
      }
    }
    return conflicts;
  }

  private void addConflict(EventEntity first, CalendarTimeWindow firstWindow,
                           EventEntity second, CalendarTimeWindow secondWindow,
                           List<EventConflictDto> conflicts) {
    firstWindow.overlapWith(secondWindow).ifPresent(overlap ->
        conflicts.add(new EventConflictDto(
            mapper.toDto(first), mapper.toDto(second), overlap.start(), overlap.end())));
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
