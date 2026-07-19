package io.backend.lined.lobby.service;

import io.backend.lined.lobby.api.LobbyCreateDto;
import io.backend.lined.lobby.api.LobbyDto;
import io.backend.lined.lobby.api.LobbyUpdateDto;
import java.util.List;

public interface LobbyService {

  LobbyDto create(LobbyCreateDto dto, Long ownerId);

  LobbyDto getById(Long id);

  List<LobbyDto> myLobbies(Long userId);

  LobbyDto update(Long lobbyId, LobbyUpdateDto dto, Long requesterId, long expectedVersion);

  @Deprecated
  default LobbyDto update(Long lobbyId, LobbyUpdateDto dto, Long requesterId) {
    return update(lobbyId, dto, requesterId, -1L);
  }

  LobbyDto removeMember(Long lobbyId, Long userIdToRemove, Long requesterId, long expectedVersion);

  @Deprecated
  default LobbyDto removeMember(Long lobbyId, Long userIdToRemove, Long requesterId) {
    return removeMember(lobbyId, userIdToRemove, requesterId, -1L);
  }

  void delete(Long lobbyId, Long requesterId, long expectedVersion);

  @Deprecated
  default void delete(Long lobbyId, Long requesterId) {
    delete(lobbyId, requesterId, -1L);
  }

}
