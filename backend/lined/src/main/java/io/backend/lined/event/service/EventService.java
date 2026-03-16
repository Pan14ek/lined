package io.backend.lined.event.service;

import io.backend.lined.event.api.dto.EventConflictDto;
import io.backend.lined.event.api.dto.EventCreateDto;
import io.backend.lined.event.api.dto.EventDto;
import io.backend.lined.event.api.dto.EventUpdateDto;
import io.backend.lined.event.api.dto.UserConflictDto;
import java.time.OffsetDateTime;
import java.util.List;

public interface EventService {

  EventDto create(EventCreateDto dto, Long currentUserId);

  EventDto update(Long id, EventUpdateDto dto, Long currentUserId);

  void delete(Long id, Long currentUserId);

  List<EventDto> list(Long lobbyId, OffsetDateTime from, OffsetDateTime to, Long currentUserId);

  List<EventConflictDto> findConflicts(Long lobbyId, OffsetDateTime start,
                                       OffsetDateTime end, Long requesterId);

  UserConflictDto hasConflict(Long userId, OffsetDateTime start,
                              OffsetDateTime end, Long requesterId);

}
