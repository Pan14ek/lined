package io.backend.lined.role.api;

import io.backend.lined.role.domain.RoleEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring",
    unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface RoleMapper {

  RoleDto toDto(RoleEntity role);

  @Mapping(target = "users", ignore = true)
  RoleEntity toEntity(RoleDto dto);

}
