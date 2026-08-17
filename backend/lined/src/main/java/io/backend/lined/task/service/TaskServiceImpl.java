package io.backend.lined.task.service;

import io.backend.lined.common.EntityFinder;
import io.backend.lined.common.idempotency.IdempotencyOperation;
import io.backend.lined.common.idempotency.IdempotencyClaim;
import io.backend.lined.common.idempotency.IdempotencyService;
import io.backend.lined.common.metrics.PrivateItemMetrics;
import io.backend.lined.common.metrics.PrivateItemType;
import io.backend.lined.common.VersionPrecondition;
import io.backend.lined.common.exception.BadRequestException;
import io.backend.lined.common.exception.NotFoundException;
import io.backend.lined.common.exception.PrivateItemNotificationException;
import io.backend.lined.common.exception.PrivateTaskAssigneeException;
import io.backend.lined.lobby.domain.LobbyEntity;
import io.backend.lined.lobby.domain.LobbyRepository;
import io.backend.lined.lobby.service.LobbyAccessPolicy;
import io.backend.lined.lobby.service.LobbyWriteAction;
import io.backend.lined.lobby.service.LobbyWritePolicy;
import io.backend.lined.notification.service.NotificationService;
import io.backend.lined.task.api.TaskCreateDto;
import io.backend.lined.task.api.TaskDto;
import io.backend.lined.task.api.TaskMapper;
import io.backend.lined.task.api.TaskUpdateDto;
import io.backend.lined.task.domain.TaskEntity;
import io.backend.lined.task.domain.TaskPriority;
import io.backend.lined.task.domain.TaskRepository;
import io.backend.lined.task.domain.TaskStatus;
import io.backend.lined.task.domain.TaskVisibility;
import io.backend.lined.user.domain.UserEntity;
import io.backend.lined.user.domain.UserRepository;
import jakarta.transaction.Transactional;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Applies task lifecycle, lobby-write, and private-task access rules.
 *
 * <p>For example, a creator can add a private surprise-preparation task without exposing it to a
 * partner, while existing shared-task workflows retain their lobby policy and notifications.</p>
 */
@Service
@RequiredArgsConstructor
@Transactional
public class TaskServiceImpl implements TaskService {

  private final TaskRepository repo;
  private final LobbyRepository lobbyRepo;
  private final UserRepository userRepo;
  private final TaskMapper mapper;
  private final LobbyAccessPolicy accessPolicy;
  private final LobbyWritePolicy writePolicy;
  private final NotificationService notificationService;
  private final TaskAccessPolicy taskAccessPolicy;
  private final IdempotencyService idempotencyService;
  private final PrivateItemMetrics privateItemMetrics;

  /**
   * Creates a task after normalizing the private-task assignee invariant.
   *
   * <p>For example, a private task without an assignee is assigned to its creator, while a request
   * to assign it to a partner is rejected before it can be saved or notified.</p>
   */
  @Override
  public TaskDto create(TaskCreateDto dto, Long currentUserId, String idempotencyKey) {
    var claim = idempotencyKey == null
        ? IdempotencyClaim.withoutKey()
        : idempotencyService.claim(IdempotencyOperation.TASK_CREATE, currentUserId,
            idempotencyKey, dto);
    if (claim.replay()) {
      return mapper.toDto(mustTask(claim.resourceId(), currentUserId));
    }
    var creator = mustUser(currentUserId);
    var lobby = mustLobby(dto.lobbyId());
    accessPolicy.ensureMember(lobby, currentUserId);
    writePolicy.assertWritable(lobby, LobbyWriteAction.TASK_MUTATION);
    TaskVisibility visibility = resolveVisibility(dto.visibility());
    if (visibility == TaskVisibility.PRIVATE && dto.notifyAssignee()) {
      throw new PrivateItemNotificationException();
    }

    var entity = TaskEntity.builder()
        .title(dto.title())
        .description(normalizeDescription(dto.description()))
        .priority(dto.priority() == null ? TaskPriority.MEDIUM : dto.priority())
        .status(dto.status() == null ? TaskStatus.TODO : dto.status())
        .lobby(lobby)
        .creator(creator)
        .visibility(visibility)
        .assignee(resolveCreateAssignee(dto, creator))
        .dueDate(dto.dueDate())
        .build();

    var saved = repo.save(entity);
    if (visibility == TaskVisibility.PRIVATE) {
      privateItemMetrics.recordPrivateItemCreated(PrivateItemType.TASK);
    }
    if (visibility == TaskVisibility.SHARED && dto.notifyAssignee()
        && saved.getAssignee() != null) {
      notificationService.notifyTaskAssigned(saved.getAssignee(), creator, saved);
    }
    if (idempotencyKey != null) {
      idempotencyService.complete(IdempotencyOperation.TASK_CREATE, currentUserId, claim,
          saved.getId());
    }
    return mapper.toDto(saved);
  }

  /**
   * Updates a visible task while preserving its creator-only private invariants.
   *
   * <p>For example, converting a shared task assigned to a partner into private fails unless the
   * same request reassigns it to the creator.</p>
   */
  @Override
  public TaskDto update(Long id, TaskUpdateDto dto, Long currentUserId, long expectedVersion) {
    var task = mustTask(id, currentUserId);
    accessPolicy.ensureMember(task.getLobby(), currentUserId);
    taskAccessPolicy.ensureCanMutate(task, currentUserId);
    writePolicy.assertWritable(task.getLobby(), LobbyWriteAction.TASK_MUTATION);
    verifyVersion(task.getVersion(), expectedVersion);

    TaskVisibility currentVisibility = currentVisibility(task);
    if (dto.visibility() != null) {
      taskAccessPolicy.ensureCanChangeVisibility(task, currentUserId);
    }
    UserEntity assignee = resolveUpdateAssignee(dto, task);
    TaskVisibility visibility = dto.visibility() == null ? currentVisibility : dto.visibility();
    validatePrivateAssignee(visibility, task.getCreator(), assignee);

    if (dto.title() != null && !dto.title().isBlank()) {
      task.setTitle(dto.title());
    }
    if (dto.status() != null) {
      task.setStatus(dto.status());
    }
    if (dto.assigneeId() != null || visibility == TaskVisibility.PRIVATE
        && task.getVisibility() != TaskVisibility.PRIVATE && task.getAssignee() == null) {
      task.setAssignee(assignee);
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
    if (dto.visibility() != null) {
      task.setVisibility(visibility);
    }

    if (expectedVersion >= 0) {
      repo.saveAndFlush(task);
    }
    if (visibility != currentVisibility) {
      privateItemMetrics.recordVisibilityChange(PrivateItemType.TASK, currentVisibility, visibility);
    }
    return mapper.toDto(task);
  }

  /**
   * Deletes a task only after its visibility predicate and lobby-write policy allow access.
   *
   * <p>For example, a guessed private-task ID owned by another member returns {@code 404} rather
   * than confirming that the task exists.</p>
   */
  @Override
  public void delete(Long id, Long currentUserId, long expectedVersion) {
    var task = mustTask(id, currentUserId);
    accessPolicy.ensureMember(task.getLobby(), currentUserId);
    taskAccessPolicy.ensureCanMutate(task, currentUserId);
    writePolicy.assertWritable(task.getLobby(), LobbyWriteAction.TASK_MUTATION);
    verifyVersion(task.getVersion(), expectedVersion);
    repo.delete(task);
    if (expectedVersion >= 0) {
      repo.flush();
    }
  }

  /**
   * Lists tasks through the database privacy predicate rather than filtering mapped DTOs in Java.
   *
   * <p>For example, a lobby list for user {@code 42} contains shared tasks and user {@code 42}'s
   * private tasks only.</p>
   */
  @Override
  public List<TaskDto> list(Long lobbyId, Long assigneeId, String status, Long currentUserId) {
    return repo.findVisible(currentUserId, lobbyId, assigneeId, parseStatus(status)).stream()
        .map(mapper::toDto)
        .toList();
  }

  /**
   * Lists the requester's private tasks and shared tasks assigned to them.
   */
  @Override
  public List<TaskDto> listMine(Long currentUserId) {
    return repo.findVisibleMine(currentUserId).stream().map(mapper::toDto).toList();
  }

  private UserEntity mustUser(Long id) {
    return EntityFinder.findOrThrow(userRepo.findById(id),
        () -> new NotFoundException("User %d not found".formatted(id)));
  }

  private LobbyEntity mustLobby(Long id) {
    return EntityFinder.findOrThrow(lobbyRepo.findById(id),
        () -> new NotFoundException("Lobby %d not found".formatted(id)));
  }

  /**
   * Loads a task through its privacy predicate before the caller performs a write.
   *
   * <p>For example, a private task owned by another member produces the same result as an
   * unknown task, preventing a guessed ID from confirming its existence.</p>
   */
  private TaskEntity mustTask(Long id, Long requesterId) {
    return EntityFinder.findOrThrow(repo.findVisibleById(id, requesterId),
        () -> notFoundAfterPrivacyMetric(id, requesterId));
  }

  private NotFoundException notFoundAfterPrivacyMetric(Long id, Long requesterId) {
    if (repo.existsPrivateTaskCreatedByAnotherUser(id, requesterId)) {
      privateItemMetrics.recordAccessDenied(PrivateItemType.TASK);
    }
    return new NotFoundException("Task %d not found".formatted(id));
  }

  /**
   * Uses shared visibility when clients omit the new field.
   *
   * <p>For example, a deployed client that sends the pre-privacy task payload continues to create
   * a shared task rather than unexpectedly hiding it.</p>
   */
  private TaskVisibility resolveVisibility(TaskVisibility visibility) {
    return visibility == null ? TaskVisibility.SHARED : visibility;
  }

  private TaskVisibility currentVisibility(TaskEntity task) {
    return resolveVisibility(task.getVisibility());
  }

  /**
   * Normalizes a private creation request to its creator and rejects cross-user assignment.
   */
  private UserEntity resolveCreateAssignee(TaskCreateDto dto, UserEntity creator) {
    TaskVisibility visibility = resolveVisibility(dto.visibility());
    UserEntity assignee = dto.assigneeId() == null ? null : mustUser(dto.assigneeId());
    if (visibility == TaskVisibility.PRIVATE && assignee == null) {
      return creator;
    }
    validatePrivateAssignee(visibility, creator, assignee);
    return assignee;
  }

  /**
   * Resolves an update's effective assignee, normalizing an unassigned shared-to-private task.
   */
  private UserEntity resolveUpdateAssignee(TaskUpdateDto dto, TaskEntity task) {
    if (dto.assigneeId() != null) {
      return mustUser(dto.assigneeId());
    }
    if (dto.visibility() == TaskVisibility.PRIVATE && currentVisibility(task) == TaskVisibility.SHARED
        && task.getAssignee() == null) {
      return task.getCreator();
    }
    return task.getAssignee();
  }

  /**
   * Enforces the lifetime invariant that every private task is assigned to its creator.
   */
  private void validatePrivateAssignee(TaskVisibility visibility, UserEntity creator,
                                       UserEntity assignee) {
    if (visibility == TaskVisibility.PRIVATE
        && (assignee == null || !creator.getId().equals(assignee.getId()))) {
      throw new PrivateTaskAssigneeException();
    }
  }

  /**
   * Converts an optional query parameter into the persisted status enum.
   *
   * <p>For example, {@code TODO} becomes {@link TaskStatus#TODO}, whereas {@code LATER} returns
   * the normal {@code 400} invalid-status response.</p>
   */
  private TaskStatus parseStatus(String status) {
    if (status == null) {
      return null;
    }
    try {
      return TaskStatus.valueOf(status);
    } catch (IllegalArgumentException e) {
      throw new BadRequestException("Invalid status value: " + status);
    }
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
