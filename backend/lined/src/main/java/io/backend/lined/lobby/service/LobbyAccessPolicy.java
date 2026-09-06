package io.backend.lined.lobby.service;

import io.backend.lined.common.exception.ForbiddenException;
import io.backend.lined.common.exception.NotFoundException;
import io.backend.lined.lobby.domain.LobbyEntity;
import java.util.Objects;
import org.springframework.stereotype.Component;

@Component
public class LobbyAccessPolicy {

  private static final String LOBBY_MUST_NOT_BE_NULL = "lobby must not be null";

  /**
   * Throws if the user is neither the lobby owner nor a member.
   * Callers must ensure {@code lobby.getOwner()} and {@code lobby.getMembers()}
   * are initialized (i.e. called within an active transaction).
   */
  public void ensureMember(LobbyEntity lobby, Long userId) {
    Objects.requireNonNull(lobby, LOBBY_MUST_NOT_BE_NULL);
    Objects.requireNonNull(userId, "userId must not be null");
    if (lobby.getOwner().getId().equals(userId)) {
      return;
    }
    boolean isMember = lobby.getMembers().stream()
        .anyMatch(u -> u.getId().equals(userId));
    if (!isMember) {
      throw new ForbiddenException("User is not a member of the lobby");
    }
  }

  /**
   * Requires membership while hiding a lobby from a complete outsider.
   *
   * @param lobby lobby being resolved
   * @param userId trusted authenticated subject
   */
  public void ensureVisibleMember(LobbyEntity lobby, Long userId) {
    Objects.requireNonNull(lobby, LOBBY_MUST_NOT_BE_NULL);
    Objects.requireNonNull(userId, "userId must not be null");
    if (!isMember(lobby, userId)) {
      throw new NotFoundException("Lobby %d not found".formatted(lobby.getId()));
    }
  }

  /**
   * Throws if the user is not the lobby owner.
   * Callers must ensure {@code lobby.getOwner()} is initialized.
   */
  public void ensureOwner(LobbyEntity lobby, Long requesterId) {
    Objects.requireNonNull(lobby, LOBBY_MUST_NOT_BE_NULL);
    Objects.requireNonNull(requesterId, "requesterId must not be null");
    if (!lobby.getOwner().getId().equals(requesterId)) {
      throw new ForbiddenException("Only lobby owner can perform this action");
    }
  }

  private boolean isMember(LobbyEntity lobby, Long userId) {
    return lobby.getOwner().getId().equals(userId)
        || lobby.getMembers().stream().anyMatch(u -> u.getId().equals(userId));
  }

}
