package io.backend.lined.lobby.service;

import io.backend.lined.common.EntityFinder;
import io.backend.lined.common.VersionPrecondition;
import io.backend.lined.common.exception.BadRequestException;
import io.backend.lined.common.exception.ConflictException;
import io.backend.lined.common.exception.NotFoundException;
import io.backend.lined.lobby.api.LobbyCreateDto;
import io.backend.lined.lobby.api.LobbyDto;
import io.backend.lined.lobby.api.LobbyMapper;
import io.backend.lined.lobby.api.LobbyUpdateDto;
import io.backend.lined.lobby.domain.LobbyEntity;
import io.backend.lined.lobby.domain.LobbyRepository;
import io.backend.lined.user.domain.UserRepository;
import jakarta.transaction.Transactional;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Transactional
public class LobbyServiceImpl implements LobbyService {

  private final LobbyRepository lobbyRepo;
  private final UserRepository userRepo;
  private final LobbyMapper mapper;
  private final LobbyAccessPolicy accessPolicy;

  @Override
  public LobbyDto create(LobbyCreateDto dto, Long ownerId) {
    var owner = EntityFinder.findOrThrow(userRepo.findById(ownerId),
        () -> new NotFoundException("Owner %d not found".formatted(ownerId)));

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
    var lobby = mustLobby(id);
    return mapper.toDto(lobby);
  }

  @Override
  public List<LobbyDto> myLobbies(Long userId) {
    var list = lobbyRepo.findAllByMemberId(userId);
    return list.stream().map(mapper::toDto).toList();
  }

  @Override
  public LobbyDto update(Long lobbyId, LobbyUpdateDto dto, Long requesterId, long expectedVersion) {
    var lobby = mustLobby(lobbyId);
    accessPolicy.ensureOwner(lobby, requesterId);
    verifyVersion(lobby.getVersion(), expectedVersion);

    if (dto.name() != null) {
      lobby.setName(dto.name());
    }
    if (dto.lobbyType() != null) {
      lobby.setLobbyType(dto.lobbyType());
    }
    if (dto.ownerId() != null) {
      transferOwnership(lobby, dto.ownerId());
    }
    if (expectedVersion >= 0) {
      lobbyRepo.saveAndFlush(lobby);
    }
    return mapper.toDto(lobby);
  }

  @Override
  public LobbyDto removeMember(Long lobbyId, Long userIdToRemove, Long requesterId,
                               long expectedVersion) {
    var lobby = mustLobby(lobbyId);

    accessPolicy.ensureOwner(lobby, requesterId);
    verifyVersion(lobby.getVersion(), expectedVersion);

    if (lobby.getOwner().getId().equals(userIdToRemove)) {
      throw new BadRequestException("Owner cannot be removed from lobby");
    }

    lobby.getMembers().removeIf(u -> u.getId().equals(userIdToRemove));
    if (expectedVersion >= 0) {
      lobbyRepo.saveAndFlush(lobby);
    }
    return mapper.toDto(lobby);
  }

  @Override
  public void delete(Long lobbyId, Long requesterId, long expectedVersion) {
    var lobby = mustLobby(lobbyId);
    accessPolicy.ensureOwner(lobby, requesterId);
    verifyVersion(lobby.getVersion(), expectedVersion);
    lobbyRepo.delete(lobby);
    if (expectedVersion >= 0) {
      lobbyRepo.flush();
    }
  }

  private LobbyEntity mustLobby(Long id) {
    return EntityFinder.findOrThrow(
        lobbyRepo.findById(id),
        () -> new NotFoundException("Lobby %d not found".formatted(id)));
  }

  private void verifyVersion(long actualVersion, long expectedVersion) {
    if (expectedVersion >= 0) {
      VersionPrecondition.verify(actualVersion, expectedVersion);
    }
  }

  private void transferOwnership(LobbyEntity lobby, Long newOwnerId) {
    var newOwner = lobby.getMembers().stream()
        .filter(member -> member.getId().equals(newOwnerId))
        .findFirst()
        .orElseThrow(() -> new ConflictException("New owner must be a lobby member"));
    lobby.setOwner(newOwner);
  }

}
