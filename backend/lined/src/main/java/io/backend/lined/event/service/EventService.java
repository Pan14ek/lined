package io.backend.lined.event.service;

import io.backend.lined.event.api.dto.EventConflictDto;
import io.backend.lined.event.api.dto.EventCreateDto;
import io.backend.lined.event.api.dto.EventDto;
import io.backend.lined.event.api.dto.EventUpdateDto;
import io.backend.lined.event.api.dto.UserConflictDto;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * Service interface for managing lobby events.
 * Provides CRUD operations and conflict detection for scheduling.
 */
public interface EventService {

  /**
   * Creates a new event within a lobby.
   * Validates that startAt is strictly before endAt.
   *
   * @param dto           the event creation data
   * @param currentUserId the ID of the user creating the event
   * @return the created event as a DTO
   * @throws IllegalArgumentException if startAt is not before endAt
   * @throws SecurityException        if the user is not a lobby member
   * @throws NoSuchElementException   if the lobby or user is not found
   */
  EventDto create(EventCreateDto dto, Long currentUserId);

  /**
   * Updates an existing event.
   * Only non-null fields in the DTO are applied.
   *
   * @param id            the event ID to update
   * @param dto           the update data
   * @param currentUserId the ID of the requesting user
   * @return the updated event as a DTO
   * @throws IllegalArgumentException if the updated dates are invalid
   * @throws SecurityException        if the user is not a lobby member
   * @throws NoSuchElementException   if the event is not found
   */
  EventDto update(Long id, EventUpdateDto dto, Long currentUserId);

  /**
   * Deletes an event by its unique identifier.
   *
   * @param id            the event ID to delete
   * @param currentUserId the ID of the requesting user
   * @throws SecurityException      if the user is not a lobby member
   * @throws NoSuchElementException if the event is not found
   */
  void delete(Long id, Long currentUserId);

  /**
   * Lists all events in a lobby within a given time window.
   *
   * @param lobbyId       the lobby ID
   * @param from          the start of the time window (inclusive)
   * @param to            the end of the time window (exclusive)
   * @param currentUserId the ID of the requesting user
   * @return a list of events ordered by start time
   * @throws IllegalArgumentException if the time window is invalid
   * @throws SecurityException        if the user is not a lobby member
   */
  List<EventDto> list(Long lobbyId, OffsetDateTime from, OffsetDateTime to, Long currentUserId);

  /**
   * Finds all pairs of overlapping events within a lobby time window.
   *
   * @param lobbyId     the lobby ID to check
   * @param start       the start of the time window
   * @param end         the end of the time window
   * @param requesterId the ID of the requesting user
   * @return a list of conflicting event pairs with overlap bounds
   * @throws IllegalArgumentException if start is not before end
   * @throws SecurityException        if the user is not a lobby member
   */
  List<EventConflictDto> findConflicts(Long lobbyId, OffsetDateTime start,
                                       OffsetDateTime end, Long requesterId);

  /**
   * Checks whether a specific user has any scheduling conflict in a time window.
   *
   * @param userId      the user ID to check
   * @param start       the start of the time window
   * @param end         the end of the time window
   * @param requesterId the ID of the requesting user
   * @return a conflict result with whether a conflict exists and which event causes it
   * @throws IllegalArgumentException if start is not before end
   */
  UserConflictDto hasConflict(Long userId, OffsetDateTime start,
                              OffsetDateTime end, Long requesterId);

}
