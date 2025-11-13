package io.backend.lined.task.service;

import io.backend.lined.lobby.domain.LobbyEntity;
import io.backend.lined.lobby.domain.LobbyRepository;
import io.backend.lined.task.api.TaskCreateDto;
import io.backend.lined.task.api.TaskDto;
import io.backend.lined.task.api.TaskMapper;
import io.backend.lined.task.api.TaskUpdateDto;
import io.backend.lined.task.domain.TaskEntity;
import io.backend.lined.task.domain.TaskRepository;
import io.backend.lined.task.domain.TaskStatus;
import io.backend.lined.user.domain.UserEntity;
import io.backend.lined.user.domain.UserRepository;
import jakarta.transaction.Transactional;
import java.util.List;
import java.util.NoSuchElementException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Transactional
public class TaskServiceImpl implements TaskService {

  private final TaskRepository repo;
  private final LobbyRepository lobbyRepo;
  private final UserRepository userRepo;
  private final TaskMapper mapper;

  @Override
  public TaskDto create(TaskCreateDto dto, Long currentUserId) {
    var creator = mustUser(currentUserId);
    var lobby = mustLobby(dto.lobbyId());

    var entity = TaskEntity.builder()
        .title(dto.title())
        .status(TaskStatus.TODO)
        .lobby(lobby)
        .creator(creator)
        .assignee(dto.assigneeId() == null ? null : mustUser(dto.assigneeId()))
        .dueDate(dto.dueDate())
        .build();

    return mapper.toDto(repo.save(entity));
  }

  @Override
  public TaskDto update(Long id, TaskUpdateDto dto, Long currentUserId) {
    var task = mustTask(id);
    ensureMember(task.getLobby(), currentUserId);

    if (dto.title() != null && !dto.title().isBlank()) {
      task.setTitle(dto.title());
    }
    if (dto.status() != null) {
      task.setStatus(dto.status());
    }
    if (dto.assigneeId() != null) {
      task.setAssignee(mustUser(dto.assigneeId()));
    }
    if (dto.dueDate() != null) {
      task.setDueDate(dto.dueDate());
    }

    return mapper.toDto(task);
  }

  @Override
  public void delete(Long id, Long currentUserId) {
    var task = mustTask(id);
    ensureMember(task.getLobby(), currentUserId);
    repo.delete(task);
  }

  @Override
  public List<TaskDto> list(Long lobbyId, Long assigneeId, String status) {
    Specification<TaskEntity> spec =
        (root, q, cb) -> cb.conjunction();

    if (lobbyId != null) {
      spec = spec.and((root, q, cb) -> cb.equal(root.get("lobby").get("id"), lobbyId));
    }
    if (assigneeId != null) {
      spec = spec.and((root, q, cb) -> cb.equal(root.get("assignee").get("id"), assigneeId));
    }
    if (status != null) {
      var st = TaskStatus.valueOf(status);
      spec = spec.and((root, q, cb) -> cb.equal(root.get("status"), st));
    }

    return repo.findAll(spec).stream().map(mapper::toDto).toList();
  }

  private UserEntity mustUser(Long id) {
    return userRepo.findById(id)
        .orElseThrow(() -> new NoSuchElementException("User %d not found".formatted(id)));
  }

  private LobbyEntity mustLobby(Long id) {
    return lobbyRepo.findById(id)
        .orElseThrow(() -> new NoSuchElementException("Lobby %d not found".formatted(id)));
  }

  private TaskEntity mustTask(Long id) {
    return repo.findById(id)
        .orElseThrow(() -> new NoSuchElementException("Task %d not found".formatted(id)));
  }

  private void ensureMember(LobbyEntity lobby, Long userId) {
    var isOwner = lobby.getOwner().getId().equals(userId);
    var isMember = lobby.getMembers().stream().anyMatch(u -> u.getId().equals(userId));
    if (!isOwner && !isMember) {
      throw new SecurityException("User is not a member of the lobby");
    }
  }
}
