package io.backend.lined.role.api;

import io.backend.lined.role.domain.RoleEntity;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "lined",
    unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface RoleMapper {

  RoleDto toDto(RoleEntity role);

  RoleEntity toEntity(RoleDto dto);

}
