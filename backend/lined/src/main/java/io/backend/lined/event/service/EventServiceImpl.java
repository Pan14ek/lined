package io.backend.lined.event.service;

import io.backend.lined.common.EntityFinder;
import io.backend.lined.common.exception.ForbiddenException;
import io.backend.lined.common.exception.NotFoundException;
import io.backend.lined.event.api.EventConflictDto;
import io.backend.lined.event.api.EventCreateDto;
import io.backend.lined.event.api.EventDto;
import io.backend.lined.event.api.EventMapper;
import io.backend.lined.event.api.EventUpdateDto;
import io.backend.lined.event.api.UserConflictDto;
import io.backend.lined.event.domain.EventEntity;
import io.backend.lined.event.domain.EventRepository;
import io.backend.lined.lobby.domain.LobbyEntity;
import io.backend.lined.lobby.domain.LobbyRepository;
import io.backend.lined.lobby.service.LobbyAccessPolicy;
import io.backend.lined.user.domain.UserEntity;
import io.backend.lined.user.domain.UserRepository;
import jakarta.transaction.Transactional;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Transactional
public class EventServiceImpl implements EventService {

  private final EventRepository repo;
  private final LobbyRepository lobbyRepo;
  private final UserRepository userRepo;
  private final EventMapper mapper;
  private final LobbyAccessPolicy accessPolicy;
  private final EventConflictAnalyzer conflictAnalyzer;

  @Override
  public EventDto create(EventCreateDto dto, Long currentUserId) {
    var owner = mustUser(currentUserId);
    var lobby = mustLobby(dto.lobbyId());
    accessPolicy.ensureMember(lobby, currentUserId);
    var window = eventWindow(dto.startAt(), dto.endAt());

    var entity = EventEntity.builder()
        .title(dto.title())
        .location(normalizeLocation(dto.location()))
        .shared(dto.shared())
        .startAt(window.start())
        .endAt(window.end())
        .timezone(dto.timezone())
        .lobby(lobby)
        .owner(owner)
        .build();

    return mapper.toDto(repo.save(entity));
  }

  @Override
  public EventDto update(Long id, EventUpdateDto dto, Long currentUserId) {
    var e = mustEvent(id);
    accessPolicy.ensureMember(e.getLobby(), currentUserId);
    var window = eventWindow(
        dto.startAt() == null ? e.getStartAt() : dto.startAt(),
        dto.endAt() == null ? e.getEndAt() : dto.endAt());

    if (dto.title() != null && !dto.title().isBlank()) {
      e.setTitle(dto.title());
    }
    if (dto.location() != null) {
      e.setLocation(normalizeLocation(dto.location()));
    }
    if (dto.shared() != null) {
      e.setShared(dto.shared());
    }
    e.setStartAt(window.start());
    e.setEndAt(window.end());
    if (dto.timezone() != null && !dto.timezone().isBlank()) {
      e.setTimezone(dto.timezone());
    }

    return mapper.toDto(e);
  }

  @Override
  public void delete(Long id, Long currentUserId) {
    var e = mustEvent(id);
    accessPolicy.ensureMember(e.getLobby(), currentUserId);
    repo.delete(e);
  }

  @Override
  public List<EventDto> list(Long lobbyId, OffsetDateTime from, OffsetDateTime to,
                             Long currentUserId) {
    var lobby = mustLobby(lobbyId);
    accessPolicy.ensureMember(lobby, currentUserId);
    var window = queryWindow(from, to);

    return repo.findOverlapping(lobbyId, window.start(), window.end()).stream()
        .map(mapper::toDto)
        .toList();
  }

  @Override
  public List<EventConflictDto> findConflicts(Long lobbyId,
                                              OffsetDateTime start, OffsetDateTime end,
                                              Long requesterId) {
    var lobby = mustLobby(lobbyId);
    accessPolicy.ensureMember(lobby, requesterId);
    var window = conflictWindow(start, end);
    var events = repo.findOverlapping(lobbyId, window.start(), window.end());
    return conflictAnalyzer.findConflicts(events);
  }

  @Override
  public UserConflictDto hasConflict(Long userId, OffsetDateTime start,
                                     OffsetDateTime end, Long requesterId) {
    ensureOwnCalendar(userId, requesterId);
    var window = conflictWindow(start, end);
    var overlapping = repo.findOverlappingByUser(userId, window.start(), window.end());
    if (overlapping.isEmpty()) {
      return new UserConflictDto(userId, false, null);
    }
    return new UserConflictDto(userId, true, mapper.toDto(overlapping.get(0)));
  }

  private UserEntity mustUser(Long id) {
    return EntityFinder.findOrThrow(userRepo.findById(id),
        () -> new NotFoundException("User %d not found".formatted(id)));
  }

  private LobbyEntity mustLobby(Long id) {
    return EntityFinder.findOrThrow(lobbyRepo.findById(id),
        () -> new NotFoundException("Lobby %d not found".formatted(id)));
  }

  private EventEntity mustEvent(Long id) {
    return EntityFinder.findOrThrow(repo.findById(id),
        () -> new NotFoundException("Event %d not found".formatted(id)));
  }

  private CalendarTimeWindow eventWindow(OffsetDateTime start, OffsetDateTime end) {
    return CalendarTimeWindow.of(start, end, "startAt must be before endAt");
  }

  private String normalizeLocation(String location) {
    if (location == null || location.isBlank()) {
      return null;
    }
    return location.trim();
  }

  private CalendarTimeWindow queryWindow(OffsetDateTime start, OffsetDateTime end) {
    return CalendarTimeWindow.of(start, end, "Invalid time window: from < to is required");
  }

  private CalendarTimeWindow conflictWindow(OffsetDateTime start, OffsetDateTime end) {
    return CalendarTimeWindow.of(start, end, "start must be before end");
  }

  private void ensureOwnCalendar(Long userId, Long requesterId) {
    if (!Objects.equals(userId, requesterId)) {
      throw new ForbiddenException("Requester can only check their own calendar");
    }
  }

}
