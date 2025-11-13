package io.backend.lined.event.service;

import io.backend.lined.event.api.EventCreateDto;
import io.backend.lined.event.api.EventDto;
import io.backend.lined.event.api.EventMapper;
import io.backend.lined.event.api.EventUpdateDto;
import io.backend.lined.event.domain.EventEntity;
import io.backend.lined.event.domain.EventRepository;
import io.backend.lined.lobby.domain.LobbyEntity;
import io.backend.lined.lobby.domain.LobbyRepository;
import io.backend.lined.user.domain.UserEntity;
import io.backend.lined.user.domain.UserRepository;
import jakarta.transaction.Transactional;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.NoSuchElementException;
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

  @Override
  public EventDto create(EventCreateDto dto, Long currentUserId) {
    var owner = mustUser(currentUserId);
    var lobby = mustLobby(dto.lobbyId());
    ensureMember(lobby, currentUserId);

    if (!dto.startAt().isBefore(dto.endAt())) {
      throw new IllegalArgumentException("startAt must be before endAt");
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
    ensureMember(e.getLobby(), currentUserId);

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
      throw new IllegalArgumentException("startAt must be before endAt");
    }

    return mapper.toDto(e);
  }

  @Override
  public void delete(Long id, Long currentUserId) {
    var e = mustEvent(id);
    ensureMember(e.getLobby(), currentUserId);
    repo.delete(e);
  }

  @Override
  public List<EventDto> list(Long lobbyId, OffsetDateTime from, OffsetDateTime to,
                             Long currentUserId) {
    var lobby = mustLobby(lobbyId);
    ensureMember(lobby, currentUserId);

    if (from == null || to == null || !from.isBefore(to)) {
      throw new IllegalArgumentException("Invalid time window: from < to is required");
    }

    return repo.findOverlapping(lobbyId, from, to).stream().map(mapper::toDto).toList();
  }

  private UserEntity mustUser(Long id) {
    return userRepo.findById(id)
        .orElseThrow(() -> new NoSuchElementException("User %d not found".formatted(id)));
  }

  private LobbyEntity mustLobby(Long id) {
    return lobbyRepo.findById(id)
        .orElseThrow(() -> new NoSuchElementException("Lobby %d not found".formatted(id)));
  }

  private EventEntity mustEvent(Long id) {
    return repo.findById(id)
        .orElseThrow(() -> new NoSuchElementException("Event %d not found".formatted(id)));
  }

  private void ensureMember(LobbyEntity lobby, Long userId) {
    var isOwner = lobby.getOwner().getId().equals(userId);
    var isMember = lobby.getMembers().stream().anyMatch(u -> u.getId().equals(userId));
    if (!isOwner && !isMember) {
      throw new SecurityException("User is not a member of the lobby");
    }
  }
}
