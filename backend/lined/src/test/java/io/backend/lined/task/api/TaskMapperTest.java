package io.backend.lined.task.api;

import static org.assertj.core.api.Assertions.assertThat;

import io.backend.lined.lobby.domain.LobbyEntity;
import io.backend.lined.task.domain.TaskEntity;
import io.backend.lined.task.domain.TaskPriority;
import io.backend.lined.task.domain.TaskStatus;
import io.backend.lined.user.domain.UserEntity;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import org.junit.jupiter.api.Test;

class TaskMapperTest {

  private final TaskMapper mapper = new TaskMapperImpl();

  @Test
  void toDto_mapsTaskMetadata() {
    OffsetDateTime createdAt = OffsetDateTime.parse("2025-01-01T12:00:00Z");
    TaskEntity task = TaskEntity.builder()
        .id(555L)
        .title("Buy groceries")
        .description("Pick up milk and bread")
        .priority(TaskPriority.HIGH)
        .status(TaskStatus.IN_PROGRESS)
        .lobby(LobbyEntity.builder().id(101L).build())
        .creator(UserEntity.builder().id(42L).build())
        .assignee(UserEntity.builder().id(77L).build())
        .dueDate(LocalDate.parse("2025-01-20"))
        .createdAt(createdAt)
        .build();

    TaskDto result = mapper.toDto(task);

    assertThat(result.description()).isEqualTo("Pick up milk and bread");
    assertThat(result.priority()).isEqualTo(TaskPriority.HIGH);
    assertThat(result.status()).isEqualTo(TaskStatus.IN_PROGRESS);
    assertThat(result.lobbyId()).isEqualTo(101L);
    assertThat(result.creatorId()).isEqualTo(42L);
    assertThat(result.assigneeId()).isEqualTo(77L);
  }
}
