package io.backend.lined.notification.api;

import io.backend.lined.notification.domain.LobbyNotificationPreferenceEntity;
import io.backend.lined.notification.domain.NotificationDeliveryEntity;
import io.backend.lined.notification.domain.NotificationEntity;
import io.backend.lined.notification.domain.UserNotificationPreferenceEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface NotificationMapper {

  NotificationPreferencesDto toDto(UserNotificationPreferenceEntity entity);

  @Mapping(target = "lobbyId", source = "lobby.id")
  LobbyNotificationPreferencesDto toDto(LobbyNotificationPreferenceEntity entity);

  @Mapping(target = "lobbyId", source = "lobby.id")
  NotificationDto toDto(NotificationEntity entity);

  NotificationDeliveryDto toDto(NotificationDeliveryEntity entity);
}
