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
  void findVisible_hidesAnotherCreatorsPrivateTask() {
    UserEntity member = persistUser("member");
    UserEntity creator = persistUser("creator");
    LobbyEntity lobby = persistLobby("Shared lobby", member, Set.of(member, creator));
    TaskEntity sharedTask = persistTask("Shared task", lobby, creator, TaskVisibility.SHARED, member);
    TaskEntity ownPrivateTask = persistTask("Own private task", lobby, member,
        TaskVisibility.PRIVATE, member);
    persistTask("Hidden private task", lobby, creator, TaskVisibility.PRIVATE, creator);
    entityManager.flush();
    entityManager.clear();

    assertThat(taskRepository.findVisible(member.getId(), lobby.getId(), null, null))
        .extracting(TaskEntity::getId)
        .containsExactlyInAnyOrder(sharedTask.getId(), ownPrivateTask.getId());
  }

  @Test
  void findVisibleMine_returnsAssignedSharedAndOwnPrivateTasksOnly() {
    UserEntity member = persistUser("member-mine");
    UserEntity creator = persistUser("creator-mine");
    LobbyEntity lobby = persistLobby("Mine lobby", member, Set.of(member, creator));
    TaskEntity assignedShared = persistTask("Assigned shared", lobby, creator,
        TaskVisibility.SHARED, member);
    TaskEntity ownPrivate = persistTask("Own private", lobby, member, TaskVisibility.PRIVATE,
        member);
    persistTask("Other private", lobby, creator, TaskVisibility.PRIVATE, creator);
    persistTask("Unassigned shared", lobby, creator, TaskVisibility.SHARED, null);
    entityManager.flush();
    entityManager.clear();

    assertThat(taskRepository.findVisibleMine(member.getId()))
        .extracting(TaskEntity::getId)
        .containsExactlyInAnyOrder(assignedShared.getId(), ownPrivate.getId());
  }

  @Test
  void findVisible_returnsEmptyList_whenUserBelongsToNoLobbies() {
    UserEntity user = persistUser("no-lobbies");
    entityManager.flush();
    entityManager.clear();

    assertThat(taskRepository.findVisible(user.getId(), null, null, null)).isEmpty();
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

  private TaskEntity persistTask(String title, LobbyEntity lobby, UserEntity creator,
                                 TaskVisibility visibility, UserEntity assignee) {
    TaskEntity task = TaskEntity.builder()
        .title(title)
        .lobby(lobby)
        .creator(creator)
        .assignee(assignee)
        .status(TaskStatus.TODO)
        .visibility(visibility)
        .build();
    entityManager.persist(task);
    return task;
  }
}
