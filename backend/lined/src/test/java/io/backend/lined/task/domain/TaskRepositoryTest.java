package io.backend.lined.task.domain;

import static org.assertj.core.api.Assertions.assertThat;

import io.backend.lined.lobby.domain.LobbyEntity;
import io.backend.lined.lobby.domain.LobbyTypes;
import io.backend.lined.user.domain.UserEntity;
import jakarta.persistence.EntityManager;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

@DataJpaTest(properties = "spring.sql.init.mode=never")
class TaskRepositoryTest {

  @Autowired
  private TaskRepository taskRepository;

  @Autowired
  private EntityManager entityManager;

  @Test
  void findAllByLobbyMemberId_returnsOnlyTasksFromMemberLobbies() {
    UserEntity member = persistUser("member");
    UserEntity outsider = persistUser("outsider");
    LobbyEntity memberLobby = persistLobby("Member lobby", member, Set.of(member));
    LobbyEntity outsiderLobby = persistLobby("Outsider lobby", outsider, Set.of(outsider));
    TaskEntity visibleTask = persistTask("Visible task", memberLobby, member);
    persistTask("Hidden task", outsiderLobby, outsider);
    entityManager.flush();
    entityManager.clear();

    assertThat(taskRepository.findAllByLobbyMemberId(member.getId()))
        .extracting(TaskEntity::getId)
        .containsExactly(visibleTask.getId());
  }

  @Test
  void findAllByLobbyMemberId_returnsEmptyList_whenUserBelongsToNoLobbies() {
    UserEntity user = persistUser("no-lobbies");
    entityManager.flush();
    entityManager.clear();

    assertThat(taskRepository.findAllByLobbyMemberId(user.getId())).isEmpty();
  }

  private UserEntity persistUser(String username) {
    UserEntity user = UserEntity.builder()
        .username(username)
        .email(username + "@example.com")
        .password("password")
        .build();
    entityManager.persist(user);
    return user;
  }

  private LobbyEntity persistLobby(String name, UserEntity owner, Set<UserEntity> members) {
    LobbyEntity lobby = LobbyEntity.builder()
        .name(name)
        .lobbyType(LobbyTypes.FAMILY)
        .owner(owner)
        .members(members)
        .build();
    entityManager.persist(lobby);
    return lobby;
  }

  private TaskEntity persistTask(String title, LobbyEntity lobby, UserEntity creator) {
    TaskEntity task = TaskEntity.builder()
        .title(title)
        .lobby(lobby)
        .creator(creator)
        .build();
    entityManager.persist(task);
    return task;
  }
}
