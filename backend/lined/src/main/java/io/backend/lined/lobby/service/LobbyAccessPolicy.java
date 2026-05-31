package io.backend.lined.lobby.service;

import io.backend.lined.lobby.domain.LobbyEntity;
import java.util.Objects;
import org.springframework.stereotype.Component;

@Component
public class LobbyAccessPolicy {

  /**
   * Throws if the user is neither the lobby owner nor a member.
   * Callers must ensure {@code lobby.getOwner()} and {@code lobby.getMembers()}
   * are initialized (i.e. called within an active transaction).
   */
  public void ensureMember(LobbyEntity lobby, Long userId) {
    Objects.requireNonNull(userId, "userId must not be null");
    if (lobby.getOwner().getId().equals(userId)) {
      return;
    }
    boolean isMember = lobby.getMembers().stream()
        .anyMatch(u -> u.getId().equals(userId));
    if (!isMember) {
      throw new SecurityException("User is not a member of the lobby");
    }
  }

  /**
   * Throws if the user is not the lobby owner.
   * Callers must ensure {@code lobby.getOwner()} is initialized.
   */
  public void ensureOwner(LobbyEntity lobby, Long requesterId) {
    Objects.requireNonNull(requesterId, "requesterId must not be null");
    if (!lobby.getOwner().getId().equals(requesterId)) {
      throw new SecurityException("Only lobby owner can perform this action");
    }
  }

}
