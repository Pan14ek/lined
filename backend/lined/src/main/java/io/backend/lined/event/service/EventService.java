package io.backend.lined.event.service;

import io.backend.lined.common.exception.BadRequestException;
import io.backend.lined.common.exception.ForbiddenException;
import io.backend.lined.common.exception.NotFoundException;
import io.backend.lined.event.api.EventConflictDto;
import io.backend.lined.event.api.EventCreateDto;
import io.backend.lined.event.api.EventDto;
import io.backend.lined.event.api.EventUpdateDto;
import io.backend.lined.event.api.FreeSlotDto;
import io.backend.lined.event.api.UserConflictDto;
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
   * @throws BadRequestException if startAt is not before endAt
   * @throws ForbiddenException  if the user is not a lobby member
   * @throws NotFoundException   if the lobby or user is not found
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
   * @throws BadRequestException if the updated dates are invalid
   * @throws ForbiddenException  if the user is not a lobby member
   * @throws NotFoundException   if the event is not found
   */
  EventDto update(Long id, EventUpdateDto dto, Long currentUserId);

  /**
   * Deletes an event by its unique identifier.
   *
   * @param id            the event ID to delete
   * @param currentUserId the ID of the requesting user
   * @throws ForbiddenException if the user is not a lobby member
   * @throws NotFoundException  if the event is not found
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
   * @throws BadRequestException if the time window is invalid
   * @throws ForbiddenException  if the user is not a lobby member
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
   * @throws BadRequestException if start is not before end
   * @throws ForbiddenException  if the user is not a lobby member
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
   * @throws BadRequestException if start is not before end
   */
  UserConflictDto hasConflict(Long userId, OffsetDateTime start,
                              OffsetDateTime end, Long requesterId);

  /**
   * Finds windows where every member of a lobby is free without returning calendar-event details.
   *
   * @param lobbyId       the lobby whose members' availability is checked
   * @param from          inclusive availability-window start
   * @param to            exclusive availability-window end
   * @param currentUserId the requesting lobby member
   * @return ordered common free windows
   * @throws BadRequestException if the time window is invalid
   * @throws ForbiddenException  if the requester is not a lobby member
   * @throws NotFoundException   if the lobby does not exist
   */
  List<FreeSlotDto> findFreeSlots(Long lobbyId, OffsetDateTime from,
                                  OffsetDateTime to, Long currentUserId);

}
