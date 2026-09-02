package io.backend.lined.lobby.service;

import io.backend.lined.lobby.api.LobbyCreateDto;
import io.backend.lined.lobby.api.LobbyDto;
import io.backend.lined.lobby.api.LobbyUpdateDto;
import java.util.List;

public interface LobbyService {

  LobbyDto create(LobbyCreateDto dto, Long ownerId);

  LobbyDto getById(Long id);

  /**
   * Reads a lobby only when the authenticated caller is an owner or member.
   *
   * @param id lobby identifier
   * @param requesterId trusted caller identity supplied by the controller adapter
   * @return the accessible lobby
   */
  LobbyDto getById(Long id, Long requesterId);

  List<LobbyDto> myLobbies(Long userId);

  /**
   * Lists lobbies in one lifecycle state that the caller owns or belongs to.
   *
   * <p>For example, {@code archivedLobbies(42L)} returns only archived lobbies accessible to
   * user {@code 42}, never another owner's private archived resources.</p>
   *
   * @param userId authenticated caller identifier
   * @return archived lobbies accessible to the caller
   */
  List<LobbyDto> archivedLobbies(Long userId);

  /**
   * Selects the owner's active lobby that remains writable under the Free entitlement.
   *
   * <p>For example, selecting lobby {@code 101} clears a prior selection of lobby {@code 99}
   * for the same owner and makes {@code 101} read-write.</p>
   *
   * @param lobbyId lobby selected by its owner
   * @param requesterId authenticated owner identifier
   * @return the newly selected lobby
   */
  LobbyDto selectAsFree(Long lobbyId, Long requesterId);

  /**
   * Restores an archived lobby when the owner has effective-plan capacity.
   *
   * <p>For example, a Free owner with no active lobby can restore one archived lobby; a Free
   * owner already at capacity receives {@code LOBBY_LIMIT_EXCEEDED}.</p>
   *
   * @param lobbyId archived lobby to restore
   * @param requesterId authenticated owner identifier
   * @return restored active lobby
   */
  LobbyDto restore(Long lobbyId, Long requesterId);

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
