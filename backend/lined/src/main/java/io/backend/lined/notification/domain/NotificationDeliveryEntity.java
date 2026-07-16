package io.backend.lined.notification.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Entity
@Table(name = "notification_deliveries")
public class NotificationDeliveryEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @EqualsAndHashCode.Include
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "notification_id", nullable = false)
  private NotificationEntity notification;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private NotificationDeliveryChannel channel;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private NotificationDeliveryStatus status;

  @Column(nullable = false, updatable = false)
  private OffsetDateTime queuedAt;

  private OffsetDateTime deliveredAt;

  @PrePersist
  void onCreate() {
    if (queuedAt == null) {
      queuedAt = OffsetDateTime.now();
    }
  }
}
