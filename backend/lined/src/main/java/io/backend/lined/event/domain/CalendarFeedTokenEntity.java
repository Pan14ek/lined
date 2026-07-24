package io.backend.lined.event.domain;

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
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Persists one revoked-or-active personal calendar feed credential without storing its secret.
 *
 * <p>For example, generating a feed URL for user {@code 42} stores only the SHA-256 digest of
 * its 256-bit Base64URL token. When the user regenerates or revokes the feed, the row is marked
 * with {@link #revokedAt}; retaining it lets a former subscriber receive {@code 410 Gone} rather
 * than revealing a currently valid feed.</p>
 */
@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Entity
@Table(name = "calendar_feed_tokens")
public class CalendarFeedTokenEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @EqualsAndHashCode.Include
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "user_id", nullable = false)
  private UserEntity user;

  @Column(name = "token_hash", nullable = false, unique = true, length = 64)
  private String tokenHash;

  @Column(name = "created_at", nullable = false, updatable = false)
  private OffsetDateTime createdAt;

  @Column(name = "revoked_at")
  private OffsetDateTime revokedAt;

  /**
   * Supplies a UTC creation timestamp for a newly persisted feed credential.
   *
   * <p>For example, services may build an entity with a user and hash only; persistence then
   * records when that particular subscription URL became valid. Tests may set a fixed value
   * before saving when they need deterministic lifecycle assertions.</p>
   */
  @PrePersist
  void prePersist() {
    if (createdAt == null) {
      createdAt = OffsetDateTime.now(java.time.ZoneOffset.UTC);
    }
  }
}
