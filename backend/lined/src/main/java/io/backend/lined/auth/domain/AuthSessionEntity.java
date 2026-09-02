package io.backend.lined.auth.domain;

import io.backend.lined.user.domain.UserEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Persists one independently revocable browser or device authentication session.
 *
 * <p>A successful login creates a new row rather than updating an existing user session. Refresh
 * credentials belong to this lifecycle record, so a later logout or replay response can revoke
 * one session without affecting the user's other devices.</p>
 */
@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Entity
@Table(name = "auth_sessions", indexes = {
    @Index(name = "idx_auth_sessions_user", columnList = "user_id"),
    @Index(name = "idx_auth_sessions_idle_expires", columnList = "idle_expires_at"),
    @Index(name = "idx_auth_sessions_absolute_expires", columnList = "absolute_expires_at")
})
public class AuthSessionEntity {

  @Id
  @EqualsAndHashCode.Include
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "user_id", nullable = false)
  private UserEntity user;

  @Column(name = "created_at", nullable = false, updatable = false)
  private OffsetDateTime createdAt;

  @Column(name = "last_used_at", nullable = false)
  private OffsetDateTime lastUsedAt;

  @Column(name = "idle_expires_at", nullable = false)
  private OffsetDateTime idleExpiresAt;

  @Column(name = "absolute_expires_at", nullable = false, updatable = false)
  private OffsetDateTime absoluteExpiresAt;

  @Column(name = "revoked_at")
  private OffsetDateTime revokedAt;

  @Column(name = "revocation_reason", length = 64)
  private String revocationReason;
}
