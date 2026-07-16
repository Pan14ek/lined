package io.backend.lined.lobby.service;

import io.backend.lined.lobby.api.LobbyCreateDto;
import io.backend.lined.lobby.api.LobbyDto;
import io.backend.lined.lobby.api.LobbyUpdateDto;
import java.util.List;

public interface LobbyService {

  LobbyDto create(LobbyCreateDto dto, Long ownerId);

  LobbyDto getById(Long id);

  List<LobbyDto> myLobbies(Long userId);

  LobbyDto update(Long lobbyId, LobbyUpdateDto dto, Long requesterId);

  LobbyDto addMember(Long lobbyId, Long userIdToAdd, Long requesterId);

  LobbyDto removeMember(Long lobbyId, Long userIdToRemove, Long requesterId);

  void delete(Long lobbyId, Long requesterId);

}
