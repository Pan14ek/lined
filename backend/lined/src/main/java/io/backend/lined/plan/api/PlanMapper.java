package io.backend.lined.plan.api;

import io.backend.lined.plan.domain.PlanEntity;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "lined",
    unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface PlanMapper {

  PlanDto toDto(PlanEntity plan);

  PlanEntity toEntity(PlanDto dto);
}
