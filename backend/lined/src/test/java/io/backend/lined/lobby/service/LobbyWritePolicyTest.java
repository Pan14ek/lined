package io.backend.lined.lobby.service;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.backend.lined.common.exception.ConflictException;
import io.backend.lined.lobby.domain.LobbyAccessMode;
import io.backend.lined.lobby.domain.LobbyEntity;
import java.util.Arrays;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class LobbyWritePolicyTest {

  private LobbyWritePolicy policy;
  private LobbyEntity lobby;

  @BeforeEach
  void setUp() {
    policy = new LobbyWritePolicy();
    lobby = LobbyEntity.builder().build();
  }

  @Test
  void assertWritable_allowsEveryAction_whenLobbyIsReadWrite() {
    lobby.setAccessMode(LobbyAccessMode.READ_WRITE);

    Arrays.stream(LobbyWriteAction.values())
        .forEach(action -> assertThatCode(() -> policy.assertWritable(lobby, action))
            .doesNotThrowAnyException());
  }

  @Test
  void assertWritable_allowsReductionWhitelist_whenLobbyIsReadOnly() {
    lobby.setAccessMode(LobbyAccessMode.READ_ONLY);

    assertThatCode(() -> policy.assertWritable(lobby, LobbyWriteAction.REMOVE_MEMBER))
        .doesNotThrowAnyException();
    assertThatCode(() -> policy.assertWritable(lobby, LobbyWriteAction.DELETE_LOBBY))
        .doesNotThrowAnyException();
    assertThatCode(() -> policy.assertWritable(lobby, LobbyWriteAction.LEAVE_LOBBY))
        .doesNotThrowAnyException();
    assertThatCode(() -> policy.assertWritable(lobby, LobbyWriteAction.SELECT_AS_FREE_LOBBY))
        .doesNotThrowAnyException();
  }

  @Test
  void assertWritable_throwsStableConflict_whenNonReductionActionTargetsReadOnlyLobby() {
    lobby.setAccessMode(LobbyAccessMode.READ_ONLY);

    assertThatThrownBy(() -> policy.assertWritable(lobby, LobbyWriteAction.EVENT_MUTATION))
        .isInstanceOf(ConflictException.class)
        .extracting("code")
        .isEqualTo("LOBBY_READ_ONLY_DUE_TO_PLAN");
  }
}
