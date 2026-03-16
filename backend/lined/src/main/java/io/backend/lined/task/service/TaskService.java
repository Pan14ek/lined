package io.backend.lined.task.service;


import io.backend.lined.task.api.dto.TaskCreateDto;
import io.backend.lined.task.api.dto.TaskDto;
import io.backend.lined.task.api.dto.TaskUpdateDto;
import java.util.List;

public interface TaskService {

  TaskDto create(TaskCreateDto dto, Long currentUserId);

  TaskDto update(Long id, TaskUpdateDto dto, Long currentUserId);

  void delete(Long id, Long currentUserId);

  List<TaskDto> list(Long lobbyId, Long assigneeId, String status);

}
