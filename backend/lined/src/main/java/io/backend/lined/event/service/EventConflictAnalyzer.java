package io.backend.lined.event.service;

import io.backend.lined.event.api.EventConflictDto;
import io.backend.lined.event.api.EventConflictSideDto;
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
   * Finds all pairwise conflicts and sanitizes each side for the requester.
   *
   * <p>For example, two private appointments still produce an overlap, but each owner sees only
   * their own complete event. The other side is opaque, preserving availability information
   * without leaking a title, location, or private event ID.</p>
   *
   * @param events events that already match the scheduling search window
   * @param requesterId member allowed to inspect their own private details
   * @return privacy-safe conflict pairs with calculated overlap bounds
   */
  public List<EventConflictDto> findConflicts(List<EventEntity> events, Long requesterId) {
    var windows = events.stream().map(this::windowOf).toList();
    List<EventConflictDto> conflicts = new ArrayList<>();
    for (int i = 0; i < events.size(); i++) {
      for (int j = i + 1; j < events.size(); j++) {
        addConflict(events.get(i), windows.get(i), events.get(j), windows.get(j), requesterId,
            conflicts);
      }
    }
    return conflicts;
  }

  /**
   * Retains the original analyzer entry point for callers that only process shared events.
   *
   * <p>New requester-facing code must call {@link #findConflicts(List, Long)} so private sides
   * are sanitized. This overload is kept only for internal compatibility with existing shared
   * event tests and must not be used by an HTTP request path.</p>
   *
   * @param events shared events to compare
   * @return conflict pairs with complete shared-event details
   */
  @Deprecated
  public List<EventConflictDto> findConflicts(List<EventEntity> events) {
    return findConflicts(events, null);
  }

  private void addConflict(EventEntity first, CalendarTimeWindow firstWindow,
                           EventEntity second, CalendarTimeWindow secondWindow,
                           Long requesterId,
                           List<EventConflictDto> conflicts) {
    firstWindow.overlapWith(secondWindow).ifPresent(overlap ->
        conflicts.add(new EventConflictDto(
            dtoFor(first, requesterId), dtoFor(second, requesterId), overlap.start(), overlap.end())));
  }

  /**
   * Converts one event to a full or opaque conflict side according to private ownership.
   *
   * <p>For example, a shared event is always rendered in full, while user {@code 42} viewing user
   * {@code 77}'s private event receives only {@code ownerId=77} and no event identifier.</p>
   *
   * @param event conflicting event
   * @param requesterId caller identity
   * @return safe conflict side
   */
  private EventConflictSideDto dtoFor(EventEntity event, Long requesterId) {
    if (event.isShared() || event.getOwner().getId().equals(requesterId)) {
      return new EventConflictSideDto(event.getId(), event.getOwner().getId(), event.isShared(),
          true, mapper.toDto(event));
    }
    return new EventConflictSideDto(null, event.getOwner().getId(), false, false, null);
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
