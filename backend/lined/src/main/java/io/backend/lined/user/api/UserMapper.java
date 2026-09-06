package io.backend.lined.user.api;

import io.backend.lined.role.api.RoleMapper;
import io.backend.lined.role.domain.RoleEntity;
import io.backend.lined.user.domain.UserEntity;
import java.util.Set;
import java.util.stream.Collectors;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring",
    uses = RoleMapper.class,
    unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface UserMapper {

  /**
   * Maps a user while preserving the legacy subscription fields as null placeholders.
   *
   * <p>For example, an existing user named {@code alice} is returned with her roles and profile
   * data, but {@code activePlan} and {@code activeUntil} are null until a provider-backed billing
   * projection is introduced.</p>
   *
   * @param entity persisted user to represent, or {@code null}
   * @return mapped user response, or {@code null} when {@code entity} is null
   */
  default UserDto toDto(UserEntity entity) {
    if (entity == null) {
      return null;
    }
    return new UserDto(entity.getId(), entity.getVersion(), entity.getUsername(), entity.getEmail(),
        entity.getCreatedAt(), mapRoleNames(entity.getRoles()), null, null);
  }

  default UserPublicDto toPublicDto(UserEntity entity) {
    if (entity == null) {
      return null;
    }
    return new UserPublicDto(entity.getId(), entity.getUsername());
  }

  @Mapping(target = "id", ignore = true)
  @Mapping(target = "version", ignore = true)
  @Mapping(target = "createdAt", expression = "java(java.time.OffsetDateTime.now())")
  @Mapping(target = "roles", ignore = true)
  UserEntity toEntity(UserCreateDto dto);

  @BeanMapping(ignoreByDefault = true)
  @Mapping(target = "version", ignore = true)
  @Mapping(target = "username", expression = "java(dto.username() != null ? dto.username() : entity.getUsername())")
  @Mapping(target = "email", expression = "java(dto.email() != null ? dto.email() : entity.getEmail())")
  @Mapping(target = "password", expression = "java(dto.password() != null ? dto.password() : entity.getPassword())")
  void updateEntity(@MappingTarget UserEntity entity, UserUpdateDto dto);

  default Set<String> mapRoleNames(Set<RoleEntity> roles) {
    if (roles == null) {
      return Set.of();
    }
    return roles.stream().map(RoleEntity::getName).collect(Collectors.toUnmodifiableSet());
  }

  UserSearchResultDto toSearchResultDto(UserEntity entity);
}
