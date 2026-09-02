package io.backend.lined.auth.domain;

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
 * Stores one hashed opaque refresh credential in an authentication session's token history.
 *
 * <p>The raw credential exists only while the login response is being constructed. Future
 * rotation records consumption, revocation, and a successor through the lifecycle fields here.
 * Those fields deliberately preserve history instead of replacing a session's current hash.</p>
 */
@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Entity
@Table(name = "auth_refresh_tokens", indexes = {
    @Index(name = "uq_auth_refresh_tokens_hash", columnList = "token_hash", unique = true),
    @Index(name = "idx_auth_refresh_tokens_session", columnList = "session_id"),
    @Index(name = "idx_auth_refresh_tokens_expires", columnList = "expires_at")
})
public class AuthRefreshTokenEntity {

  @Id
  @EqualsAndHashCode.Include
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "session_id", nullable = false)
  private AuthSessionEntity session;

  @Column(name = "token_hash", nullable = false, length = 64, unique = true)
  private String tokenHash;

  @Column(name = "issued_at", nullable = false, updatable = false)
  private OffsetDateTime issuedAt;

  @Column(name = "expires_at", nullable = false)
  private OffsetDateTime expiresAt;

  @Column(name = "consumed_at")
  private OffsetDateTime consumedAt;

  @Column(name = "revoked_at")
  private OffsetDateTime revokedAt;

  @Column(name = "replaced_by_token_id")
  private UUID replacedByTokenId;
}
