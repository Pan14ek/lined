package io.backend.lined.event.domain;

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
import jakarta.persistence.PrePersist;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;
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
@Table(name = "events", indexes = @Index(name = "idx_events_ics_uid", columnList = "ics_uid"),
    uniqueConstraints = @UniqueConstraint(name = "uq_events_owner_lobby_ics_uid",
        columnNames = {"owner_id", "lobby_id", "ics_uid"}))
public class EventEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @EqualsAndHashCode.Include
  private Long id;

  @Version
  @Column(nullable = false)
  private long version;

  @Column(nullable = false, length = 160)
  private String title;

  @Column(length = 255)
  private String location;

  @Column(nullable = false)
  private boolean shared;

  @Column(nullable = false)
  private OffsetDateTime startAt;

  @Column(nullable = false)
  private OffsetDateTime endAt;

  @Column(nullable = false, length = 64)
  private String timezone;

  @Column(name = "ics_uid", length = 255)
  private String icsUid;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "lobby_id", nullable = false)
  private LobbyEntity lobby;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "owner_id", nullable = false)
  private UserEntity owner;

  @Column(nullable = false)
  private OffsetDateTime createdAt;

  @PrePersist
  void onCreate() {
    if (createdAt == null) {
      createdAt = OffsetDateTime.now();
    }
  }

}
