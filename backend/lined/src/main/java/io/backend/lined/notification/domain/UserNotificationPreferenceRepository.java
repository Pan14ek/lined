package io.backend.lined.notification.domain;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserNotificationPreferenceRepository
    extends JpaRepository<UserNotificationPreferenceEntity, Long> {

  Optional<UserNotificationPreferenceEntity> findByUserId(Long userId);
}
