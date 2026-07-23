package io.backend.lined.lobby.service;

import io.backend.lined.common.exception.ConflictException;
import io.backend.lined.lobby.domain.LobbyAccessMode;
import io.backend.lined.lobby.domain.LobbyEntity;
import java.util.EnumSet;
import java.util.Objects;
import java.util.Set;
import org.springframework.stereotype.Component;

/**
 * Enforces the reduction-only write policy for read-only lobbies.
 *
 * <p>For example, a lobby restricted after a plan downgrade rejects
 * {@code assertWritable(lobby, UPDATE_LOBBY)} with the stable
 * {@code LOBBY_READ_ONLY_DUE_TO_PLAN} error code. The same lobby accepts
 * {@code REMOVE_MEMBER}, allowing the owner to make the resource compliant without support
 * intervention.</p>
 */
@Component
public class LobbyWritePolicy {

  private static final Set<LobbyWriteAction> READ_ONLY_WHITELIST = EnumSet.of(
      LobbyWriteAction.REMOVE_MEMBER,
      LobbyWriteAction.DELETE_LOBBY,
      LobbyWriteAction.LEAVE_LOBBY,
      LobbyWriteAction.SELECT_AS_FREE_LOBBY);

  /**
   * Ensures the requested mutation is permitted by the lobby's access mode.
   *
   * <p>For example, all actions pass for {@link LobbyAccessMode#READ_WRITE}. For
   * {@link LobbyAccessMode#READ_ONLY}, only the four reduction actions in the whitelist pass;
   * creating an event fails with a client-actionable conflict.</p>
   *
   * @param lobby lobby whose current access mode is being enforced
   * @param action mutation about to be performed
   * @throws ConflictException when a non-reduction action targets a read-only lobby
   */
  public void assertWritable(LobbyEntity lobby, LobbyWriteAction action) {
    Objects.requireNonNull(lobby, "lobby must not be null");
    Objects.requireNonNull(action, "action must not be null");
    if (lobby.getAccessMode() == LobbyAccessMode.READ_ONLY
        && !READ_ONLY_WHITELIST.contains(action)) {
      throw new ConflictException(
          "LOBBY_READ_ONLY_DUE_TO_PLAN", "Lobby is read-only due to its plan restrictions");
    }
  }
}
