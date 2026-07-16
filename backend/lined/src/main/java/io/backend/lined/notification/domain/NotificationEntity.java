package io.backend.lined.notification.domain;

import io.backend.lined.lobby.domain.LobbyEntity;
import io.backend.lined.user.domain.UserEntity;
import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
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
@Table(name = "notifications")
public class NotificationEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @EqualsAndHashCode.Include
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "recipient_id", nullable = false)
  private UserEntity recipient;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "lobby_id")
  private LobbyEntity lobby;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private NotificationType type;

  @Column(nullable = false, length = 160)
  private String title;

  @Column(nullable = false, length = 500)
  private String message;

  private Long taskId;

  private Long eventId;

  private OffsetDateTime readAt;

  @Column(nullable = false, updatable = false)
  private OffsetDateTime createdAt;

  @Builder.Default
  @OneToMany(mappedBy = "notification", cascade = CascadeType.ALL, orphanRemoval = true)
  private List<NotificationDeliveryEntity> deliveries = new ArrayList<>();

  @PrePersist
  void onCreate() {
    if (createdAt == null) {
      createdAt = OffsetDateTime.now();
    }
  }
}
