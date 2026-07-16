package io.backend.lined.lobby.invite.domain;

import io.backend.lined.lobby.domain.LobbyEntity;
import io.backend.lined.user.domain.UserEntity;
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
import jakarta.persistence.PreUpdate;
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
@Table(name = "lobby_invites")
public class LobbyInviteEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @EqualsAndHashCode.Include
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "lobby_id", nullable = false)
  private LobbyEntity lobby;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "inviter_id", nullable = false)
  private UserEntity inviter;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "invitee_id", nullable = false)
  private UserEntity invitee;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private LobbyInviteStatus status;

  @Column(name = "sent_at", nullable = false)
  private OffsetDateTime sentAt;

  @Column(name = "created_at", nullable = false, updatable = false)
  private OffsetDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;

  @PrePersist
  void prePersist() {
    var now = OffsetDateTime.now();
    if (status == null) {
      status = LobbyInviteStatus.PENDING;
    }
    if (sentAt == null) {
      sentAt = now;
    }
    if (createdAt == null) {
      createdAt = now;
    }
    if (updatedAt == null) {
      updatedAt = now;
    }
  }

  @PreUpdate
  void preUpdate() {
    updatedAt = OffsetDateTime.now();
  }
}
