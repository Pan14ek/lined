package io.backend.lined.lobby.service;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.backend.lined.common.exception.ForbiddenException;
import io.backend.lined.lobby.domain.LobbyEntity;
import io.backend.lined.lobby.domain.LobbyTypes;
import io.backend.lined.user.domain.UserEntity;
import java.util.HashSet;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class LobbyAccessPolicyTest {

  private LobbyAccessPolicy policy;
  private UserEntity owner;
  private UserEntity member;
  private LobbyEntity lobby;

  @BeforeEach
  void setUp() {
    policy = new LobbyAccessPolicy();

    owner = new UserEntity();
    owner.setId(1L);

    member = new UserEntity();
    member.setId(2L);

    lobby = LobbyEntity.builder()
        .id(101L)
        .name("Test Lobby")
        .lobbyType(LobbyTypes.FAMILY)
        .owner(owner)
        .members(new HashSet<>(Set.of(owner, member)))
        .build();
  }

  @Test
  void ensureMember_doesNotThrow_whenUserIsOwner() {
    assertThatCode(() -> policy.ensureMember(lobby, 1L))
        .doesNotThrowAnyException();
  }

  @Test
  void ensureMember_doesNotThrow_whenUserIsMember() {
    assertThatCode(() -> policy.ensureMember(lobby, 2L))
        .doesNotThrowAnyException();
  }

  @Test
  void ensureMember_doesNotThrow_whenUserIsOwnerNotInMembersSet() {
    var ownerOnly = LobbyEntity.builder()
        .id(102L)
        .name("Owner Only Lobby")
        .lobbyType(LobbyTypes.COUPLE)
        .owner(owner)
        .members(new HashSet<>(Set.of(member)))
        .build();
    assertThatCode(() -> policy.ensureMember(ownerOnly, 1L))
        .doesNotThrowAnyException();
  }

  @Test
  void ensureMember_throwsForbidden_whenUserIsOutsider() {
    assertThatThrownBy(() -> policy.ensureMember(lobby, 99L))
        .isInstanceOf(ForbiddenException.class)
        .hasMessageContaining("not a member");
  }

  @Test
  void ensureOwner_doesNotThrow_whenUserIsOwner() {
    assertThatCode(() -> policy.ensureOwner(lobby, 1L))
        .doesNotThrowAnyException();
  }

  @Test
  void ensureOwner_throwsForbidden_whenUserIsNotOwner() {
    assertThatThrownBy(() -> policy.ensureOwner(lobby, 2L))
        .isInstanceOf(ForbiddenException.class)
        .hasMessageContaining("owner");
  }

}
