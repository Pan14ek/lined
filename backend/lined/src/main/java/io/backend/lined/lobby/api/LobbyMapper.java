package io.backend.lined.lobby.api;

import io.backend.lined.lobby.domain.LobbyEntity;
import io.backend.lined.user.domain.UserEntity;
import java.util.Set;
import java.util.stream.Collectors;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface LobbyMapper {

  @Mapping(target = "ownerId", source = "owner.id")
  @Mapping(target = "memberIds", expression = "java(toIds(entity.getMembers()))")
  LobbyDto toDto(LobbyEntity entity);

  default Set<Long> toIds(Set<UserEntity> users) {
    return users == null ? Set.of() :
        users.stream().map(UserEntity::getId).collect(Collectors.toSet());
  }

}
