package io.backend.lined.event.service;

import io.backend.lined.common.EntityFinder;
import io.backend.lined.common.exception.BadRequestException;
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
import java.util.ArrayList;
import java.util.List;
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

  @Override
  public EventDto create(EventCreateDto dto, Long currentUserId) {
    var owner = mustUser(currentUserId);
    var lobby = mustLobby(dto.lobbyId());
    accessPolicy.ensureMember(lobby, currentUserId);

    if (!dto.startAt().isBefore(dto.endAt())) {
      throw new BadRequestException("startAt must be before endAt");
    }

    var entity = EventEntity.builder()
        .title(dto.title())
        .shared(dto.shared())
        .startAt(dto.startAt())
        .endAt(dto.endAt())
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

    if (dto.title() != null && !dto.title().isBlank()) {
      e.setTitle(dto.title());
    }
    if (dto.shared() != null) {
      e.setShared(dto.shared());
    }
    if (dto.startAt() != null) {
      e.setStartAt(dto.startAt());
    }
    if (dto.endAt() != null) {
      e.setEndAt(dto.endAt());
    }
    if (dto.timezone() != null && !dto.timezone().isBlank()) {
      e.setTimezone(dto.timezone());
    }

    if (!e.getStartAt().isBefore(e.getEndAt())) {
      throw new BadRequestException("startAt must be before endAt");
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

    if (from == null || to == null || !from.isBefore(to)) {
      throw new BadRequestException("Invalid time window: from < to is required");
    }

    return repo.findOverlapping(lobbyId, from, to).stream().map(mapper::toDto).toList();
  }

  @Override
  public List<EventConflictDto> findConflicts(Long lobbyId,
                                              OffsetDateTime start, OffsetDateTime end,
                                              Long requesterId) {
    var lobby = mustLobby(lobbyId);
    accessPolicy.ensureMember(lobby, requesterId);
    if (!start.isBefore(end)) {
      throw new BadRequestException("start must be before end");
    }
    var events = repo.findOverlapping(lobbyId, start, end);
    List<EventConflictDto> conflicts = new ArrayList<>();
    for (int i = 0; i < events.size(); i++) {
      for (int j = i + 1; j < events.size(); j++) {
        var a = events.get(i);
        var b = events.get(j);
        var overlapStart = a.getStartAt().isAfter(b.getStartAt())
            ? a.getStartAt() : b.getStartAt();
        var overlapEnd = a.getEndAt().isBefore(b.getEndAt())
            ? a.getEndAt() : b.getEndAt();
        if (overlapStart.isBefore(overlapEnd)) {
          conflicts.add(new EventConflictDto(
              mapper.toDto(a), mapper.toDto(b), overlapStart, overlapEnd));
        }
      }
    }
    return conflicts;
  }

  @Override
  public UserConflictDto hasConflict(Long userId, OffsetDateTime start,
                                     OffsetDateTime end, Long requesterId) {
    if (!start.isBefore(end)) {
      throw new BadRequestException("start must be before end");
    }
    var overlapping = repo.findOverlappingByUser(userId, start, end);
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

}
