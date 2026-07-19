package io.backend.lined.task.service;

import io.backend.lined.common.EntityFinder;
import io.backend.lined.common.VersionPrecondition;
import io.backend.lined.common.exception.BadRequestException;
import io.backend.lined.common.exception.NotFoundException;
import io.backend.lined.lobby.domain.LobbyEntity;
import io.backend.lined.lobby.domain.LobbyRepository;
import io.backend.lined.lobby.service.LobbyAccessPolicy;
import io.backend.lined.notification.service.NotificationService;
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
import jakarta.transaction.Transactional;
import java.util.List;
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
  private final LobbyAccessPolicy accessPolicy;
  private final NotificationService notificationService;

  @Override
  public TaskDto create(TaskCreateDto dto, Long currentUserId) {
    var creator = mustUser(currentUserId);
    var lobby = mustLobby(dto.lobbyId());
    accessPolicy.ensureMember(lobby, currentUserId);

    var entity = TaskEntity.builder()
        .title(dto.title())
        .description(normalizeDescription(dto.description()))
        .priority(dto.priority() == null ? TaskPriority.MEDIUM : dto.priority())
        .status(dto.status() == null ? TaskStatus.TODO : dto.status())
        .lobby(lobby)
        .creator(creator)
        .assignee(dto.assigneeId() == null ? null : mustUser(dto.assigneeId()))
        .dueDate(dto.dueDate())
        .build();

    var saved = repo.save(entity);
    if (dto.notifyAssignee() && saved.getAssignee() != null) {
      notificationService.notifyTaskAssigned(saved.getAssignee(), creator, saved);
    }
    return mapper.toDto(saved);
  }

  @Override
  public TaskDto update(Long id, TaskUpdateDto dto, Long currentUserId, long expectedVersion) {
    var task = mustTask(id);
    accessPolicy.ensureMember(task.getLobby(), currentUserId);
    verifyVersion(task.getVersion(), expectedVersion);

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
    if (dto.description() != null) {
      task.setDescription(normalizeDescription(dto.description()));
    }
    if (dto.priority() != null) {
      task.setPriority(dto.priority());
    }

    if (expectedVersion >= 0) {
      repo.saveAndFlush(task);
    }
    return mapper.toDto(task);
  }

  @Override
  public void delete(Long id, Long currentUserId, long expectedVersion) {
    var task = mustTask(id);
    accessPolicy.ensureMember(task.getLobby(), currentUserId);
    verifyVersion(task.getVersion(), expectedVersion);
    repo.delete(task);
    if (expectedVersion >= 0) {
      repo.flush();
    }
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
      TaskStatus st;
      try {
        st = TaskStatus.valueOf(status);
      } catch (IllegalArgumentException e) {
        throw new BadRequestException("Invalid status value: " + status);
      }
      spec = spec.and((root, q, cb) -> cb.equal(root.get("status"), st));
    }

    return repo.findAll(spec).stream().map(mapper::toDto).toList();
  }

  @Override
  public List<TaskDto> listMine(Long currentUserId) {
    return repo.findAllByLobbyMemberId(currentUserId).stream().map(mapper::toDto).toList();
  }

  private UserEntity mustUser(Long id) {
    return EntityFinder.findOrThrow(userRepo.findById(id),
        () -> new NotFoundException("User %d not found".formatted(id)));
  }

  private LobbyEntity mustLobby(Long id) {
    return EntityFinder.findOrThrow(lobbyRepo.findById(id),
        () -> new NotFoundException("Lobby %d not found".formatted(id)));
  }

  private TaskEntity mustTask(Long id) {
    return EntityFinder.findOrThrow(repo.findById(id),
        () -> new NotFoundException("Task %d not found".formatted(id)));
  }

  private void verifyVersion(long actualVersion, long expectedVersion) {
    if (expectedVersion >= 0) {
      VersionPrecondition.verify(actualVersion, expectedVersion);
    }
  }

  private String normalizeDescription(String description) {
    return description == null || description.isBlank() ? null : description;
  }

}
