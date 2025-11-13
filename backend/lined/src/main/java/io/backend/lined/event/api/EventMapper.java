package io.backend.lined.event.api;

import io.backend.lined.event.domain.EventEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Mappings;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface EventMapper {

  @Mappings({
      @Mapping(target = "lobbyId", source = "lobby.id"),
      @Mapping(target = "ownerId", source = "owner.id")
  })
  EventDto toDto(EventEntity e);

}
