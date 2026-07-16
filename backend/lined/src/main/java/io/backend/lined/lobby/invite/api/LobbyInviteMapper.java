package io.backend.lined.lobby.invite.api;

import io.backend.lined.lobby.invite.domain.LobbyInviteEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface LobbyInviteMapper {

  @Mapping(target = "lobbyId", source = "lobby.id")
  @Mapping(target = "inviterId", source = "inviter.id")
  @Mapping(target = "inviteeId", source = "invitee.id")
  LobbyInviteDto toDto(LobbyInviteEntity entity);
}
