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

@Tag(name = "Tasks", description = "Shared tasks management")
@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class TaskController {

  private final TaskService service;

  @Operation(summary = "Create task", description = "Creates a task in a lobby; creator is the requester.")
  @PostMapping
  public ResponseEntity<TaskDto> create(
      @Parameter(description = "Current user id (temporary for MVP)", example = "42")
      @RequestHeader("X-User-Id") Long currentUserId,
      @io.swagger.v3.oas.annotations.parameters.RequestBody(
          required = true,
          description = "Task payload",
          content = @Content(schema = @Schema(implementation = TaskCreateDto.class),
              examples = @ExampleObject(value = """
                    { "title":"Buy groceries", "lobbyId":101, "assigneeId":77, "dueDate":"2025-11-20", "description":"Pick up milk and bread", "priority":"MEDIUM", "status":"TODO", "notifyAssignee":true }
                  """)))
      @Valid @RequestBody TaskCreateDto dto) {
    TaskDto created = service.create(dto, currentUserId);
    return ResponseEntity.ok().eTag(VersionPrecondition.etag(created.version())).body(created);
  }

  @Operation(summary = "Update task", description = "Partial update (status, assignee, title, dueDate, description, priority).")
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
                    { "status":"IN_PROGRESS", "assigneeId":77, "dueDate":"2025-11-25", "description":"Pick up milk and bread", "priority":"HIGH" }
                  """)))
      @Valid @RequestBody TaskUpdateDto dto) {
    TaskDto updated = service.update(id, dto, currentUserId, VersionPrecondition.parse(ifMatch));
    return ResponseEntity.ok().eTag(VersionPrecondition.etag(updated.version())).body(updated);
  }

  @Deprecated
  public TaskDto update(Long id, Long currentUserId, TaskUpdateDto dto) {
    return service.update(id, dto, currentUserId);
  }

  @Operation(summary = "List tasks", description = "Filter by lobbyId, assigneeId, status={TODO|IN_PROGRESS|DONE}.")
  @GetMapping
  public List<TaskDto> list(
      @Parameter(example = "101") @RequestParam(required = false) Long lobbyId,
      @Parameter(example = "77") @RequestParam(required = false) Long assigneeId,
      @Parameter(example = "TODO") @RequestParam(required = false) String status) {
    return service.list(lobbyId, assigneeId, status);
  }

  @Operation(summary = "List my tasks", description = "Returns tasks in every lobby where the requester is a member.")
  @GetMapping("/mine")
  public List<TaskDto> mine(
      @Parameter(description = "Current user id (temporary for MVP)", example = "42")
      @RequestHeader("X-User-Id") Long currentUserId) {
    return service.listMine(currentUserId);
  }

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
