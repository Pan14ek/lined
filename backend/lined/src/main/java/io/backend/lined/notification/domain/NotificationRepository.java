package io.backend.lined.notification.domain;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<NotificationEntity, Long> {

  List<NotificationEntity> findAllByRecipientIdOrderByCreatedAtDesc(Long recipientId);

  Optional<NotificationEntity> findByIdAndRecipientId(Long id, Long recipientId);
}
