package io.backend.lined.user.api;

import io.backend.lined.role.api.RoleMapper;
import io.backend.lined.role.domain.RoleEntity;
import io.backend.lined.subscription.api.SubscriptionMapper;
import io.backend.lined.subscription.domain.UserSubscriptionEntity;
import io.backend.lined.user.domain.UserEntity;
import java.time.OffsetDateTime;
import java.util.Set;
import java.util.stream.Collectors;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring",
    uses = {RoleMapper.class, SubscriptionMapper.class},
    unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface UserMapper {

  @Mapping(target = "roles", expression = "java(mapRoleNames(entity.getRoles()))")
  @Mapping(target = "activePlan", expression = "java(extractActivePlanName(entity))")
  @Mapping(target = "activeUntil", expression = "java(extractActiveEndDate(entity))")
  UserDto toDto(UserEntity entity);

  @Mapping(target = "id", ignore = true)
  @Mapping(target = "createdAt", expression = "java(java.time.OffsetDateTime.now())")
  @Mapping(target = "roles", ignore = true)
  @Mapping(target = "subscriptions", ignore = true)
  UserEntity toEntity(UserCreateDto dto);

  @BeanMapping(ignoreByDefault = true)
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

  default String extractActivePlanName(UserEntity user) {
    UserSubscriptionEntity s = activeSub(user);
    return s != null ? s.getPlan().getName() : null;
  }

  default java.time.OffsetDateTime extractActiveEndDate(UserEntity user) {
    UserSubscriptionEntity s = activeSub(user);
    return s != null ? s.getEndDate() : null;
  }

  private UserSubscriptionEntity activeSub(UserEntity user) {
    if (user == null || user.getSubscriptions() == null) {
      return null;
    }

    OffsetDateTime now = OffsetDateTime.now();
    return user.getSubscriptions().stream()
        .filter(UserSubscriptionEntity::isActive)
        .filter(s -> s.getEndDate() == null || !s.getEndDate().isBefore(now))
        .findFirst().orElse(null);
  }
}
