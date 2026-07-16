package io.backend.lined.notification.domain;

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
@Table(name = "user_notification_preferences")
public class UserNotificationPreferenceEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @EqualsAndHashCode.Include
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "user_id", nullable = false, unique = true)
  private UserEntity user;

  @Builder.Default
  @Column(nullable = false)
  private boolean sharedEventsEnabled = true;

  @Builder.Default
  @Column(nullable = false)
  private boolean taskAssignedEnabled = true;

  @Builder.Default
  @Column(nullable = false)
  private boolean freeSlotsEnabled = true;

  @Builder.Default
  @Column(nullable = false)
  private boolean eventRemindersEnabled = true;

  @Builder.Default
  @Column(nullable = false)
  private boolean emailDigestsEnabled = true;
}
