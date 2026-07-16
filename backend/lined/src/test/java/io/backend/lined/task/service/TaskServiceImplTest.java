package io.backend.lined.task.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.backend.lined.common.exception.BadRequestException;
import io.backend.lined.common.exception.ForbiddenException;
import io.backend.lined.common.exception.NotFoundException;
import io.backend.lined.lobby.domain.LobbyEntity;
import io.backend.lined.lobby.domain.LobbyRepository;
import io.backend.lined.lobby.domain.LobbyTypes;
import io.backend.lined.lobby.service.LobbyAccessPolicy;
import io.backend.lined.task.api.TaskCreateDto;
import io.backend.lined.task.api.TaskDto;
import io.backend.lined.task.api.TaskMapper;
import io.backend.lined.task.api.TaskUpdateDto;
import io.backend.lined.task.domain.TaskEntity;
import io.backend.lined.task.domain.TaskPriority;
import io.backend.lined.task.domain.TaskRepository;
import io.backend.lined.task.domain.TaskStatus;
import io.backend.lined.user.domain.UserEntity;
import io.backend.lined.user.domain.UserRepository;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TaskServiceImplTest {

  @Mock
  private TaskRepository repo;
  @Mock
  private LobbyRepository lobbyRepo;
  @Mock
  private UserRepository userRepo;
  @Mock
  private TaskMapper mapper;
  @Spy
  private LobbyAccessPolicy accessPolicy;

  @InjectMocks
  private TaskServiceImpl taskService;

  private UserEntity owner;
  private LobbyEntity lobby;
  private TaskEntity taskEntity;
  private TaskDto taskDto;

  @BeforeEach
  void setUp() {
    owner = new UserEntity();
    owner.setId(1L);
    owner.setUsername("owner");

    lobby = LobbyEntity.builder()
        .id(101L)
        .name("Test Lobby")
        .lobbyType(LobbyTypes.FAMILY)
        .owner(owner)
        .members(new HashSet<>(Set.of(owner)))
        .build();

    taskEntity = TaskEntity.builder()
        .id(555L)
        .title("Buy groceries")
        .description("Pick up milk")
        .priority(TaskPriority.MEDIUM)
        .status(TaskStatus.TODO)
        .lobby(lobby)
        .creator(owner)
        .build();

    taskDto = new TaskDto(555L, "Buy groceries", "Pick up milk", TaskPriority.MEDIUM,
        TaskStatus.TODO, 101L, 1L, null, null, null);
  }

  /* =======================
     CREATE
  ======================= */

  @Test
  void create_success() {
    TaskCreateDto dto = new TaskCreateDto("Buy groceries", 101L, null, null,
        null, null, null);

    when(userRepo.findById(1L)).thenReturn(Optional.of(owner));
    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobby));
    when(repo.save(any(TaskEntity.class))).thenReturn(taskEntity);
    when(mapper.toDto(taskEntity)).thenReturn(taskDto);

    TaskDto result = taskService.create(dto, 1L);

    assertThat(result).isEqualTo(taskDto);
    verify(repo).save(any(TaskEntity.class));
  }

  @Test
  void create_appliesProvidedMetadata() {
    TaskCreateDto dto = new TaskCreateDto("Buy groceries", 101L, null, null,
        "Pick up milk and bread", TaskPriority.HIGH, TaskStatus.IN_PROGRESS);
    ArgumentCaptor<TaskEntity> taskCaptor = ArgumentCaptor.forClass(TaskEntity.class);

    when(userRepo.findById(1L)).thenReturn(Optional.of(owner));
    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobby));
    when(repo.save(taskCaptor.capture())).thenReturn(taskEntity);
    when(mapper.toDto(taskEntity)).thenReturn(taskDto);

    taskService.create(dto, 1L);

    assertThat(taskCaptor.getValue().getDescription()).isEqualTo("Pick up milk and bread");
    assertThat(taskCaptor.getValue().getPriority()).isEqualTo(TaskPriority.HIGH);
    assertThat(taskCaptor.getValue().getStatus()).isEqualTo(TaskStatus.IN_PROGRESS);
  }

  @Test
  void create_defaultsMissingPriorityAndStatus() {
    TaskCreateDto dto = new TaskCreateDto("Buy groceries", 101L, null, null,
        null, null, null);
    ArgumentCaptor<TaskEntity> taskCaptor = ArgumentCaptor.forClass(TaskEntity.class);

    when(userRepo.findById(1L)).thenReturn(Optional.of(owner));
    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobby));
    when(repo.save(taskCaptor.capture())).thenReturn(taskEntity);
    when(mapper.toDto(taskEntity)).thenReturn(taskDto);

    taskService.create(dto, 1L);

    assertThat(taskCaptor.getValue().getPriority()).isEqualTo(TaskPriority.MEDIUM);
    assertThat(taskCaptor.getValue().getStatus()).isEqualTo(TaskStatus.TODO);
  }

  @Test
  void create_throwsNotFound_whenCreatorNotFound() {
    TaskCreateDto dto = new TaskCreateDto("Buy groceries", 101L, null, null,
        null, null, null);

    when(userRepo.findById(99L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> taskService.create(dto, 99L))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("99");

    verify(repo, never()).save(any());
  }

  @Test
  void create_throwsNotFound_whenLobbyNotFound() {
    TaskCreateDto dto = new TaskCreateDto("Buy groceries", 999L, null, null,
        null, null, null);

    when(userRepo.findById(1L)).thenReturn(Optional.of(owner));
    when(lobbyRepo.findById(999L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> taskService.create(dto, 1L))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("999");

    verify(repo, never()).save(any());
  }

  @Test
  void create_throwsForbidden_whenUserIsNotLobbyMember() {
    TaskCreateDto dto = new TaskCreateDto("Buy groceries", 101L, null, null,
        null, null, null);

    when(userRepo.findById(99L)).thenReturn(Optional.of(new UserEntity()));
    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobby));

    assertThatThrownBy(() -> taskService.create(dto, 99L))
        .isInstanceOf(ForbiddenException.class)
        .hasMessageContaining("not a member");

    verify(repo, never()).save(any());
  }

  /* =======================
     UPDATE
  ======================= */

  @Test
  void update_success() {
    TaskUpdateDto dto = new TaskUpdateDto(TaskStatus.IN_PROGRESS, null, null, "Updated title",
        "Updated description", TaskPriority.HIGH);

    when(repo.findById(555L)).thenReturn(Optional.of(taskEntity));
    when(mapper.toDto(taskEntity)).thenReturn(taskDto);

    TaskDto result = taskService.update(555L, dto, 1L);

    assertThat(result).isEqualTo(taskDto);
    assertThat(taskEntity.getStatus()).isEqualTo(TaskStatus.IN_PROGRESS);
    assertThat(taskEntity.getTitle()).isEqualTo("Updated title");
    assertThat(taskEntity.getDescription()).isEqualTo("Updated description");
    assertThat(taskEntity.getPriority()).isEqualTo(TaskPriority.HIGH);
    verify(accessPolicy).ensureMember(lobby, 1L);
  }

  @Test
  void update_skipsNullFields() {
    TaskUpdateDto dto = new TaskUpdateDto(null, null, null, null, null, null);

    when(repo.findById(555L)).thenReturn(Optional.of(taskEntity));
    when(mapper.toDto(taskEntity)).thenReturn(taskDto);

    taskService.update(555L, dto, 1L);

    assertThat(taskEntity.getTitle()).isEqualTo("Buy groceries");
    assertThat(taskEntity.getStatus()).isEqualTo(TaskStatus.TODO);
    assertThat(taskEntity.getDescription()).isEqualTo("Pick up milk");
    assertThat(taskEntity.getPriority()).isEqualTo(TaskPriority.MEDIUM);
  }

  @Test
  void update_clearsDescription_whenBlank() {
    TaskUpdateDto dto = new TaskUpdateDto(null, null, null, null, "  ", null);

    when(repo.findById(555L)).thenReturn(Optional.of(taskEntity));
    when(mapper.toDto(taskEntity)).thenReturn(taskDto);

    taskService.update(555L, dto, 1L);

    assertThat(taskEntity.getDescription()).isNull();
  }

  @Test
  void update_throwsNotFound_whenTaskNotFound() {
    TaskUpdateDto dto = new TaskUpdateDto(null, null, null, "Title", null, null);

    when(repo.findById(999L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> taskService.update(999L, dto, 1L))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("999");
  }

  @Test
  void update_throwsForbidden_whenUserIsNotLobbyMember() {
    TaskUpdateDto dto = new TaskUpdateDto(null, null, null, "Title", null, null);

    when(repo.findById(555L)).thenReturn(Optional.of(taskEntity));

    assertThatThrownBy(() -> taskService.update(555L, dto, 99L))
        .isInstanceOf(ForbiddenException.class)
        .hasMessageContaining("not a member");
  }

  /* =======================
     DELETE
  ======================= */

  @Test
  void delete_success() {
    when(repo.findById(555L)).thenReturn(Optional.of(taskEntity));

    taskService.delete(555L, 1L);

    verify(accessPolicy).ensureMember(lobby, 1L);
    verify(repo).delete(taskEntity);
  }

  @Test
  void delete_throwsNotFound_whenTaskNotFound() {
    when(repo.findById(999L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> taskService.delete(999L, 1L))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("999");

    verify(repo, never()).delete(any(TaskEntity.class));
  }

  @Test
  void delete_throwsForbidden_whenUserIsNotLobbyMember() {
    when(repo.findById(555L)).thenReturn(Optional.of(taskEntity));

    assertThatThrownBy(() -> taskService.delete(555L, 99L))
        .isInstanceOf(ForbiddenException.class)
        .hasMessageContaining("not a member");

    verify(repo, never()).delete(any(TaskEntity.class));
  }

  /* =======================
     LIST
  ======================= */

  @Test
  void list_returnsMatchingTasks() {
    when(repo.findAll(any(org.springframework.data.jpa.domain.Specification.class)))
        .thenReturn(List.of(taskEntity));
    when(mapper.toDto(taskEntity)).thenReturn(taskDto);

    List<TaskDto> result = taskService.list(101L, null, null);

    assertThat(result).hasSize(1).containsExactly(taskDto);
  }

  @Test
  void list_returnsEmpty_whenNoTasksMatch() {
    when(repo.findAll(any(org.springframework.data.jpa.domain.Specification.class)))
        .thenReturn(List.of());

    List<TaskDto> result = taskService.list(101L, null, null);

    assertThat(result).isEmpty();
  }

  @Test
  void list_throwsBadRequest_whenStatusIsInvalid() {
    assertThatThrownBy(() -> taskService.list(null, null, "INVALID_STATUS"))
        .isInstanceOf(BadRequestException.class)
        .hasMessageContaining("Invalid status value");
  }

  @Test
  void listMine_returnsTasksVisibleToCurrentUser() {
    when(repo.findAllByLobbyMemberId(1L)).thenReturn(List.of(taskEntity));
    when(mapper.toDto(taskEntity)).thenReturn(taskDto);

    List<TaskDto> result = taskService.listMine(1L);

    assertThat(result).containsExactly(taskDto);
    verify(repo).findAllByLobbyMemberId(1L);
  }

  @Test
  void listMine_returnsEmptyList_whenUserHasNoLobbyTasks() {
    when(repo.findAllByLobbyMemberId(99L)).thenReturn(List.of());

    List<TaskDto> result = taskService.listMine(99L);

    assertThat(result).isEmpty();
  }

}
