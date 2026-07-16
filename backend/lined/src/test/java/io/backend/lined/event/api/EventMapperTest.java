package io.backend.lined.event.api;

import static org.assertj.core.api.Assertions.assertThat;

import io.backend.lined.event.domain.EventEntity;
import io.backend.lined.lobby.domain.LobbyEntity;
import io.backend.lined.user.domain.UserEntity;
import java.time.OffsetDateTime;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

class EventMapperTest {

  private final EventMapper mapper = Mappers.getMapper(EventMapper.class);

  @Test
  void toDto_mapsLocation() {
    var event = EventEntity.builder()
        .id(9001L)
        .title("Dinner together")
        .location("Whole Foods Market")
        .shared(true)
        .startAt(OffsetDateTime.parse("2026-01-01T10:00:00Z"))
        .endAt(OffsetDateTime.parse("2026-01-01T12:00:00Z"))
        .timezone("Europe/Kyiv")
        .lobby(lobby(101L))
        .owner(user(42L))
        .createdAt(OffsetDateTime.parse("2026-01-01T09:00:00Z"))
        .build();

    EventDto result = mapper.toDto(event);

    assertThat(result.location()).isEqualTo("Whole Foods Market");
  }

  private LobbyEntity lobby(Long id) {
    var lobby = new LobbyEntity();
    lobby.setId(id);
    return lobby;
  }

  private UserEntity user(Long id) {
    var user = new UserEntity();
    user.setId(id);
    return user;
  }

}
