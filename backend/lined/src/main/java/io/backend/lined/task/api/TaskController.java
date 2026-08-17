package io.backend.lined.task.api;

import io.backend.lined.task.service.TaskService;
import io.backend.lined.common.VersionPrecondition;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.ResponseEntity;

/**
 * HTTP boundary for requester-aware task operations.
 *
 * <p>For example, a list request carries {@code X-User-Id: 42} so the service can return shared
 * tasks plus user {@code 42}'s private tasks without exposing another creator's private work.</p>
 */
@Tag(name = "Tasks", description = "Shared tasks management")
@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class TaskController {

  private final TaskService service;

  /**
   * Creates a shared or creator-owned private task for the caller.
   *
   * @param currentUserId requester identity from the MVP header
   * @param dto validated creation payload; private tasks are self-assigned
   * @return created task with its optimistic-lock ETag
   */
  @Operation(summary = "Create task", description = "Creates a task in a lobby; creator is the requester.")
  @PostMapping
  public ResponseEntity<TaskDto> create(
      @Parameter(description = "Current user id (temporary for MVP)", example = "42")
      @RequestHeader("X-User-Id") Long currentUserId,
      @Parameter(description = "Optional retry key; same requester, key, and body replay one task")
      @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
      @io.swagger.v3.oas.annotations.parameters.RequestBody(
          required = true,
          description = "Task payload",
          content = @Content(schema = @Schema(implementation = TaskCreateDto.class),
              examples = @ExampleObject(value = """
                    { "title":"Buy groceries", "lobbyId":101, "assigneeId":77, "dueDate":"2025-11-20", "description":"Pick up milk and bread", "priority":"MEDIUM", "status":"TODO", "visibility":"SHARED", "notifyAssignee":true }
                  """)))
      @Valid @RequestBody TaskCreateDto dto) {
    TaskDto created = service.create(dto, currentUserId, idempotencyKey);
    return ResponseEntity.ok().eTag(VersionPrecondition.etag(created.version())).body(created);
  }

  @Deprecated
  public ResponseEntity<TaskDto> create(Long currentUserId, TaskCreateDto dto) {
    TaskDto created = service.create(dto, currentUserId);
    return ResponseEntity.ok().eTag(VersionPrecondition.etag(created.version())).body(created);
  }

  /**
   * Applies a partial task update after privacy and version checks.
   *
   * <p>For example, a creator may send {@code visibility=PRIVATE} with their own assignee ID,
   * while another lobby member cannot hide a shared task.</p>
   */
  @Operation(summary = "Update task", description = "Partial update including creator-only visibility changes.")
  @PatchMapping("/{id}")
  public ResponseEntity<TaskDto> update(
      @Parameter(description = "Task ID", example = "555") @PathVariable Long id,
      @Parameter(description = "Current user id (temporary for MVP)", example = "42")
      @RequestHeader("X-User-Id") Long currentUserId,
      @RequestHeader(value = "If-Match", required = false) String ifMatch,
      @io.swagger.v3.oas.annotations.parameters.RequestBody(
          required = true,
          content = @Content(schema = @Schema(implementation = TaskUpdateDto.class),
              examples = @ExampleObject(value = """
                    { "status":"IN_PROGRESS", "assigneeId":77, "dueDate":"2025-11-25", "description":"Pick up milk and bread", "priority":"HIGH", "visibility":"SHARED" }
                  """)))
      @Valid @RequestBody TaskUpdateDto dto) {
    TaskDto updated = service.update(id, dto, currentUserId, VersionPrecondition.parse(ifMatch));
    return ResponseEntity.ok().eTag(VersionPrecondition.etag(updated.version())).body(updated);
  }

  @Deprecated
  public TaskDto update(Long id, Long currentUserId, TaskUpdateDto dto) {
    return service.update(id, dto, currentUserId);
  }

  /**
   * Lists only database-filtered tasks visible to the requester.
   *
   * <p>For example, user {@code 42} sees shared member-lobby tasks and private tasks created by
   * user {@code 42}, never a partner's private task.</p>
   */
  @Operation(summary = "List visible tasks", description = "Filters requester-visible tasks by lobby, assignee, and status.")
  @GetMapping
  public List<TaskDto> list(
      @Parameter(description = "Current user id (temporary for MVP)", example = "42")
      @RequestHeader("X-User-Id") Long currentUserId,
      @Parameter(example = "101") @RequestParam(required = false) Long lobbyId,
      @Parameter(example = "77") @RequestParam(required = false) Long assigneeId,
      @Parameter(example = "TODO") @RequestParam(required = false) String status) {
    return service.list(lobbyId, assigneeId, status, currentUserId);
  }

  /**
   * Lists the caller's actionable shared tasks and their own private tasks.
   */
  @Operation(summary = "List my tasks", description = "Returns assigned shared tasks and creator-owned private tasks.")
  @GetMapping("/mine")
  public List<TaskDto> mine(
      @Parameter(description = "Current user id (temporary for MVP)", example = "42")
      @RequestHeader("X-User-Id") Long currentUserId) {
    return service.listMine(currentUserId);
  }

  /**
   * Deletes a visible task after the requester satisfies privacy and lobby-write rules.
   */
  @Operation(summary = "Delete task", description = "Delete task (lobby owner or member).")
  @DeleteMapping("/{id}")
  public void delete(
      @Parameter(description = "Task ID", example = "555") @PathVariable Long id,
      @Parameter(description = "Current user id (temporary for MVP)", example = "42")
      @RequestHeader("X-User-Id") Long currentUserId,
      @RequestHeader(value = "If-Match", required = false) String ifMatch) {
    service.delete(id, currentUserId, VersionPrecondition.parse(ifMatch));
  }

  @Deprecated
  public void delete(Long id, Long currentUserId) {
    service.delete(id, currentUserId);
  }

}
