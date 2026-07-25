package io.backend.lined.task.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.backend.lined.common.exception.BadRequestException;
import io.backend.lined.common.exception.ForbiddenException;
import io.backend.lined.common.exception.NotFoundException;
import io.backend.lined.task.domain.TaskStatus;
import io.backend.lined.task.domain.TaskPriority;
import io.backend.lined.task.domain.TaskVisibility;
import io.backend.lined.task.service.TaskService;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TaskControllerTest {

  @Mock
  private TaskService taskService;

  private TaskController controller;
  private TaskDto sampleTask;

  @BeforeEach
  void setUp() {
    controller = new TaskController(taskService);
    sampleTask = new TaskDto(555L, 0L, "Buy groceries", "Pick up milk", TaskPriority.MEDIUM,
        TaskStatus.TODO, TaskVisibility.SHARED, 101L, 42L, 77L, null, OffsetDateTime.now());
  }

  @Test
  void create_delegatesToService() {
    var dto = new TaskCreateDto("Buy groceries", 101L, 77L, null,
        "Pick up milk", TaskPriority.HIGH, TaskStatus.IN_PROGRESS);
    when(taskService.create(dto, 42L)).thenReturn(sampleTask);

    TaskDto result = controller.create(42L, dto).getBody();

    assertThat(result).isEqualTo(sampleTask);
    verify(taskService).create(dto, 42L);
  }

  @Test
  void create_propagatesForbidden_whenNotMember() {
    var dto = new TaskCreateDto("Buy groceries", 101L, null, null,
        null, null, null);
    when(taskService.create(dto, 99L))
        .thenThrow(new ForbiddenException("Not a lobby member"));

    assertThatThrownBy(() -> controller.create(99L, dto))
        .isInstanceOf(ForbiddenException.class)
        .hasMessageContaining("member");
  }

  @Test
  void create_propagatesNotFoundException_whenLobbyOrCreatorNotFound() {
    var dto = new TaskCreateDto("Buy groceries", 999L, null, null,
        null, null, null);
    when(taskService.create(dto, 42L))
        .thenThrow(new NotFoundException("Lobby 999 not found"));

    assertThatThrownBy(() -> controller.create(42L, dto))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("999");
  }

  @Test
  void update_delegatesToService() {
    var dto = new TaskUpdateDto(TaskStatus.IN_PROGRESS, 77L, null, null,
        "Updated description", TaskPriority.HIGH);
    when(taskService.update(555L, dto, 42L)).thenReturn(sampleTask);

    TaskDto result = controller.update(555L, 42L, dto);

    assertThat(result).isEqualTo(sampleTask);
    verify(taskService).update(555L, dto, 42L);
  }

  @Test
  void update_propagatesNotFoundException_whenTaskNotFound() {
    var dto = new TaskUpdateDto(TaskStatus.DONE, null, null, null, null, null);
    when(taskService.update(999L, dto, 42L))
        .thenThrow(new NotFoundException("Task 999 not found"));

    assertThatThrownBy(() -> controller.update(999L, 42L, dto))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("999");
  }

  @Test
  void update_propagatesForbidden_whenNotMember() {
    var dto = new TaskUpdateDto(null, null, null, "New title", null, null);
    when(taskService.update(555L, dto, 99L))
        .thenThrow(new ForbiddenException("Not a lobby member"));

    assertThatThrownBy(() -> controller.update(555L, 99L, dto))
        .isInstanceOf(ForbiddenException.class)
        .hasMessageContaining("member");
  }

  @Test
  void list_delegatesToService() {
    when(taskService.list(101L, 77L, "TODO", 42L)).thenReturn(List.of(sampleTask));

    List<TaskDto> result = controller.list(42L, 101L, 77L, "TODO");

    assertThat(result).containsExactly(sampleTask);
    verify(taskService).list(101L, 77L, "TODO", 42L);
  }

  @Test
  void list_propagatesBadRequest_whenStatusInvalid() {
    when(taskService.list(null, null, "INVALID", 42L))
        .thenThrow(new BadRequestException("Unknown task status: INVALID"));

    assertThatThrownBy(() -> controller.list(42L, null, null, "INVALID"))
        .isInstanceOf(BadRequestException.class)
        .hasMessageContaining("INVALID");
  }

  @Test
  void mine_delegatesToService() {
    when(taskService.listMine(42L)).thenReturn(List.of(sampleTask));

    List<TaskDto> result = controller.mine(42L);

    assertThat(result).containsExactly(sampleTask);
    verify(taskService).listMine(42L);
  }

  @Test
  void delete_delegatesToService() {
    controller.delete(555L, 42L);

    verify(taskService).delete(555L, 42L);
  }

  @Test
  void delete_propagatesNotFoundException_whenTaskNotFound() {
    doThrow(new NotFoundException("Task 999 not found"))
        .when(taskService).delete(999L, 42L);

    assertThatThrownBy(() -> controller.delete(999L, 42L))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("999");
  }

  @Test
  void delete_propagatesForbidden_whenNotMember() {
    doThrow(new ForbiddenException("Not a lobby member"))
        .when(taskService).delete(555L, 99L);

    assertThatThrownBy(() -> controller.delete(555L, 99L))
        .isInstanceOf(ForbiddenException.class)
        .hasMessageContaining("member");
  }
}
