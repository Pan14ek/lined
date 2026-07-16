package io.backend.lined.event.domain;

import static org.assertj.core.api.Assertions.assertThat;

import io.backend.lined.lobby.domain.LobbyEntity;
import io.backend.lined.lobby.domain.LobbyTypes;
import io.backend.lined.user.domain.UserEntity;
import jakarta.persistence.EntityManager;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

@DataJpaTest(properties = "spring.sql.init.mode=never")
class EventRepositoryTest {

  @Autowired
  private EventRepository eventRepository;

  @Autowired
  private EntityManager entityManager;

  @Test
  void findBusyForMemberIds_respectsPrivateAndSharedAttendanceRules() {
    var owner = persistUser("owner");
    var member = persistUser("member");
    var outsider = persistUser("outsider");
    var memberLobby = persistLobby(outsider, Set.of(outsider, member));
    var legacyOwnerLobby = persistLobby(owner, Set.of(outsider));
    var outsiderLobby = persistLobby(outsider, Set.of(outsider));
    var from = OffsetDateTime.parse("2026-01-01T09:00:00Z");
    var to = from.plusHours(8);
    var privateOwner = persistEvent("Private owner", false, owner, outsiderLobby, from, to);
    persistEvent("Private outsider", false, outsider, outsiderLobby, from, to);
    var sharedForMember = persistEvent("Shared member", true, outsider, memberLobby, from, to);
    var sharedForLegacyOwner = persistEvent(
        "Shared legacy owner", true, outsider, legacyOwnerLobby, from, to);
    persistEvent("Shared outsider", true, outsider, outsiderLobby, from, to);
    entityManager.flush();
    entityManager.clear();

    List<EventEntity> result = eventRepository.findBusyForMemberIds(
        Set.of(owner.getId(), member.getId()), from, to);

    assertThat(result).extracting(EventEntity::getId)
        .containsExactlyInAnyOrder(
            privateOwner.getId(), sharedForMember.getId(), sharedForLegacyOwner.getId());
  }

  private UserEntity persistUser(String username) {
    var user = UserEntity.builder()
        .username(username)
        .email(username + "@example.com")
        .password("encoded-password")
        .build();
    entityManager.persist(user);
    return user;
  }

  private LobbyEntity persistLobby(UserEntity owner, Set<UserEntity> members) {
    var lobby = LobbyEntity.builder()
        .name("Lobby " + owner.getUsername() + members.size())
        .lobbyType(LobbyTypes.FAMILY)
        .owner(owner)
        .members(members)
        .build();
    entityManager.persist(lobby);
    return lobby;
  }

  private EventEntity persistEvent(String title, boolean shared, UserEntity owner, LobbyEntity lobby,
                                   OffsetDateTime start, OffsetDateTime end) {
    var event = EventEntity.builder()
        .title(title)
        .shared(shared)
        .startAt(start)
        .endAt(end)
        .timezone("UTC")
        .owner(owner)
        .lobby(lobby)
        .build();
    entityManager.persist(event);
    return event;
  }
}
