package io.backend.lined.lobby.invite.api;

import static org.assertj.core.api.Assertions.assertThat;

import io.backend.lined.lobby.domain.LobbyEntity;
import io.backend.lined.lobby.invite.domain.LobbyInviteEntity;
import io.backend.lined.lobby.invite.domain.LobbyInviteStatus;
import io.backend.lined.user.domain.UserEntity;
import java.time.OffsetDateTime;
import org.junit.jupiter.api.Test;

class LobbyInviteMapperTest {

  private final LobbyInviteMapper mapper = new LobbyInviteMapperImpl();

  @Test
  void toDto_mapsInviteReferencesAndMetadata() {
    var now = OffsetDateTime.parse("2026-07-16T10:00:00Z");
    var invite = LobbyInviteEntity.builder()
        .id(501L)
        .lobby(LobbyEntity.builder().id(101L).build())
        .inviter(UserEntity.builder().id(1L).build())
        .invitee(UserEntity.builder().id(2L).build())
        .status(LobbyInviteStatus.PENDING)
        .sentAt(now)
        .createdAt(now)
        .updatedAt(now)
        .build();

    LobbyInviteDto result = mapper.toDto(invite);

    assertThat(result).isEqualTo(new LobbyInviteDto(501L, 101L, 1L, 2L,
        LobbyInviteStatus.PENDING, now, now, now));
  }
}
