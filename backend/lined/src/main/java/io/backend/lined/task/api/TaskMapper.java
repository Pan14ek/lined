package io.backend.lined.task.api;

import io.backend.lined.task.domain.TaskEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Mappings;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface TaskMapper {

  @Mappings({
      @Mapping(target = "lobbyId", source = "lobby.id"),
      @Mapping(target = "creatorId", source = "creator.id"),
      @Mapping(target = "assigneeId", source = "assignee.id")
  })
  TaskDto toDto(TaskEntity entity);

}
