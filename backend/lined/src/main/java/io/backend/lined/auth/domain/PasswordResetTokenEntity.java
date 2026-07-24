package io.backend.lined.auth.domain;

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

@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@AllArgsConstructor
@NoArgsConstructor
@Builder
/**
 * Persists the server-side state of one password-reset credential without storing its raw value.
 *
 * <p>A reset request for user {@code 42} creates a row containing the user relationship, an
 * HMAC hash of the opaque token, and an expiry such as {@code 2026-07-24T20:30:00Z}. Before a
 * successful redemption {@link #usedAt} is {@code null}; the atomic claim sets it once, making a
 * second submission of the same token invalid. Deleting the user cascades to its reset rows.</p>
 */
@Entity
@Table(name = "password_reset_tokens")
public class PasswordResetTokenEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @EqualsAndHashCode.Include
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "user_id", nullable = false)
  private UserEntity user;

  @Column(name = "token_hash", nullable = false, length = 255)
  private String tokenHash;

  @Column(name = "expires_at", nullable = false)
  private OffsetDateTime expiresAt;

  @Column(name = "used_at")
  private OffsetDateTime usedAt;

  @Column(name = "created_at", nullable = false, updatable = false)
  private OffsetDateTime createdAt;

  /**
   * Supplies a creation timestamp when a caller builds a token without one.
   *
   * <p>For example, a service can build a token with its hash and expiry only; JPA then fills
   * {@code createdAt} during insertion. Explicit test fixtures may still set a known creation
   * time before persistence.</p>
   */
  @PrePersist
  void prePersist() {
    if (createdAt == null) {
      createdAt = OffsetDateTime.now();
    }
  }
}
