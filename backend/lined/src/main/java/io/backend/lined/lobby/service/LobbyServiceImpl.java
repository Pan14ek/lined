package io.backend.lined.lobby.service;

import io.backend.lined.lobby.api.LobbyCreateDto;
import io.backend.lined.lobby.api.LobbyDto;
import io.backend.lined.lobby.api.LobbyMapper;
import io.backend.lined.lobby.domain.LobbyEntity;
import io.backend.lined.lobby.domain.LobbyRepository;
import io.backend.lined.user.domain.UserRepository;
import jakarta.transaction.Transactional;
import java.util.List;
import java.util.NoSuchElementException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Transactional
public class LobbyServiceImpl implements LobbyService {

  private final LobbyRepository lobbyRepo;
  private final UserRepository userRepo;
  private final LobbyMapper mapper;

  @Override
  public LobbyDto create(LobbyCreateDto dto, Long ownerId) {
    var owner = userRepo.findById(ownerId)
        .orElseThrow(() -> new NoSuchElementException("Owner %d not found".formatted(ownerId)));

    var entity = LobbyEntity.builder()
        .name(dto.name())
        .lobbyType(dto.lobbyType())
        .owner(owner)
        .build();

    entity.getMembers().add(owner);

    var saved = lobbyRepo.save(entity);
    return mapper.toDto(saved);
  }

  @Override
  public LobbyDto getById(Long id) {
    var lobby = lobbyRepo.findById(id)
        .orElseThrow(() -> new NoSuchElementException("Lobby %d not found".formatted(id)));
    return mapper.toDto(lobby);
  }

  @Override
  public List<LobbyDto> myLobbies(Long userId) {
    var list = lobbyRepo.findAllByMemberId(userId);
    return list.stream().map(mapper::toDto).toList();
  }

  @Override
  public LobbyDto addMember(Long lobbyId, Long userIdToAdd, Long requesterId) {
    var lobby = lobbyRepo.findById(lobbyId)
        .orElseThrow(() -> new NoSuchElementException("Lobby %d not found".formatted(lobbyId)));

    ensureOwner(lobby, requesterId);

    var user = userRepo.findById(userIdToAdd)
        .orElseThrow(() -> new NoSuchElementException("User %d not found".formatted(userIdToAdd)));

    lobby.getMembers().add(user);
    return mapper.toDto(lobby);
  }

  @Override
  public LobbyDto removeMember(Long lobbyId, Long userIdToRemove, Long requesterId) {
    var lobby = lobbyRepo.findById(lobbyId)
        .orElseThrow(() -> new NoSuchElementException("Lobby %d not found".formatted(lobbyId)));

    ensureOwner(lobby, requesterId);

    if (lobby.getOwner().getId().equals(userIdToRemove)) {
      throw new IllegalArgumentException("Owner cannot be removed from lobby");
    }

    lobby.getMembers().removeIf(u -> u.getId().equals(userIdToRemove));
    return mapper.toDto(lobby);
  }

  @Override
  public void delete(Long lobbyId, Long requesterId) {
    var lobby = lobbyRepo.findById(lobbyId)
        .orElseThrow(() -> new NoSuchElementException("Lobby %d not found".formatted(lobbyId)));
    ensureOwner(lobby, requesterId);
    lobbyRepo.delete(lobby);
  }

  private void ensureOwner(LobbyEntity lobby, Long requesterId) {
    if (!lobby.getOwner().getId().equals(requesterId)) {
      throw new SecurityException("Only lobby owner can perform this action");
    }
  }
}
