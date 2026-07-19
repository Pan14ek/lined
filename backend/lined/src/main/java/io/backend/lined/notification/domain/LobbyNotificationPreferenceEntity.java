package io.backend.lined.notification.domain;

import io.backend.lined.lobby.domain.LobbyEntity;
import io.backend.lined.user.domain.UserEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
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
@Table(name = "lobby_notification_preferences")
public class LobbyNotificationPreferenceEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @EqualsAndHashCode.Include
  private Long id;

  @Version
  @Column(nullable = false)
  private long version;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "user_id", nullable = false)
  private UserEntity user;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "lobby_id", nullable = false)
  private LobbyEntity lobby;

  @Builder.Default
  @Column(nullable = false)
  private boolean newEventsEnabled = true;

  @Builder.Default
  @Column(nullable = false)
  private boolean taskUpdatesEnabled = true;

  @Builder.Default
  @Column(nullable = false)
  private boolean freeSlotsEnabled = true;
}
