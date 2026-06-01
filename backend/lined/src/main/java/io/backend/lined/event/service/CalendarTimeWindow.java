package io.backend.lined.event.service;

import io.backend.lined.common.exception.BadRequestException;
import java.time.OffsetDateTime;
import java.util.Optional;

/**
 * Validated half-open calendar time window where start is inclusive and end is exclusive.
 *
 * @param start inclusive start instant
 * @param end exclusive end instant
 */
record CalendarTimeWindow(OffsetDateTime start, OffsetDateTime end) {

  /**
   * Creates a validated time window.
   *
   * @param start inclusive start instant
   * @param end exclusive end instant
   * @param message error message used when the bounds are invalid
   * @return validated calendar time window
   * @throws BadRequestException when either bound is null or start is not before end
   */
  static CalendarTimeWindow of(OffsetDateTime start, OffsetDateTime end, String message) {
    if (start == null || end == null || !start.isBefore(end)) {
      throw new BadRequestException(message);
    }
    return new CalendarTimeWindow(start, end);
  }

  /**
   * Checks whether this window overlaps another window using half-open interval semantics.
   *
   * @param other validated window to compare with
   * @return true when the windows share a non-empty time range
   */
  boolean overlaps(CalendarTimeWindow other) {
    return start.isBefore(other.end) && end.isAfter(other.start);
  }

  /**
   * Calculates the shared bounds between this window and another window.
   *
   * @param other validated window to compare with
   * @return overlap bounds, or empty when the windows do not overlap
   */
  Optional<CalendarTimeWindow> overlapWith(CalendarTimeWindow other) {
    if (!overlaps(other)) {
      return Optional.empty();
    }
    // The overlap of two validated windows is always valid, so this can skip re-validation.
    return Optional.of(new CalendarTimeWindow(max(start, other.start), min(end, other.end)));
  }

  /**
   * Returns the later of two timestamps.
   *
   * @param first first timestamp
   * @param second second timestamp
   * @return later timestamp
   */
  private static OffsetDateTime max(OffsetDateTime first, OffsetDateTime second) {
    return first.isAfter(second) ? first : second;
  }

  /**
   * Returns the earlier of two timestamps.
   *
   * @param first first timestamp
   * @param second second timestamp
   * @return earlier timestamp
   */
  private static OffsetDateTime min(OffsetDateTime first, OffsetDateTime second) {
    return first.isBefore(second) ? first : second;
  }
}
