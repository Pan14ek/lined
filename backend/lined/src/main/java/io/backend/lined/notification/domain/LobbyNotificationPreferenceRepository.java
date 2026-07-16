package io.backend.lined.notification.domain;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LobbyNotificationPreferenceRepository
    extends JpaRepository<LobbyNotificationPreferenceEntity, Long> {

  Optional<LobbyNotificationPreferenceEntity> findByUserIdAndLobbyId(Long userId, Long lobbyId);
}
