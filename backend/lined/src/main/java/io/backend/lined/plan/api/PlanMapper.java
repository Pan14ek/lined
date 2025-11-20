package io.backend.lined.plan.api;

import io.backend.lined.plan.domain.PlanEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring",
    unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface PlanMapper {

  PlanDto toDto(PlanEntity plan);

  @Mapping(target = "id", ignore = true)
  @Mapping(target = "createdAt", ignore = true)
  @Mapping(target = "subscriptions", ignore = true)
  PlanEntity toEntity(PlanCreateDto dto);

  @Mapping(target = "id", ignore = true)
  @Mapping(target = "createdAt", ignore = true)
  @Mapping(target = "subscriptions", ignore = true)
  void updateEntityFromDto(PlanUpdateDto dto, @MappingTarget PlanEntity entity);
}
