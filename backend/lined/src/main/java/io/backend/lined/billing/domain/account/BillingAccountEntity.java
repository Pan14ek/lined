package io.backend.lined.billing.domain.account;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
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
@Table(name = "billing_accounts", uniqueConstraints = @UniqueConstraint(
    name = "uq_billing_accounts_owner_type", columnNames = {"owner_user_id", "type"}))
/**
 * Persistent aggregate that owns a user's billing state.
 *
 * <p>The unique {@code (owner_user_id, type)} invariant permits exactly one personal account per
 * user. For example, a new row for user {@code 42} is stored as
 * {@code {owner_user_id=42, type=PERSONAL, status=ACTIVE}} and later subscriptions attach to its
 * generated ID.</p>
 *
 * <p>The version column supports optimistic locking, while lifecycle callbacks assign UTC
 * creation and update timestamps when callers do not provide them.</p>
 */
public class BillingAccountEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @EqualsAndHashCode.Include
  private Long id;

  @Column(name = "owner_user_id", nullable = false)
  private Long ownerUserId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private BillingAccountType type;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private BillingAccountStatus status;

  @Version
  @Column(nullable = false)
  private long version;

  @Column(name = "created_at", nullable = false, updatable = false)
  private OffsetDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;

  /**
   * Initializes creation and update timestamps immediately before the first insert.
   *
   * <p>Example: a builder-created account with no timestamps receives the same current UTC value
   * for both fields; explicitly supplied timestamps are retained.</p>
   */
  @PrePersist
  void prePersist() {
    OffsetDateTime now = OffsetDateTime.now();
    if (createdAt == null) {
      createdAt = now;
    }
    if (updatedAt == null) {
      updatedAt = now;
    }
  }

  /**
   * Refreshes the mutable update timestamp before an existing account is written.
   *
   * <p>Example: changing an account's status updates {@code updatedAt} while retaining its
   * original {@code createdAt} value.</p>
   */
  @PreUpdate
  void preUpdate() {
    updatedAt = OffsetDateTime.now();
  }
}
