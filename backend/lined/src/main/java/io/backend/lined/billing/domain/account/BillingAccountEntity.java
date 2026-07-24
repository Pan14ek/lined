package io.backend.lined.billing.domain.account;

import io.backend.lined.billing.domain.common.BillingAuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = false)
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
public class BillingAccountEntity extends BillingAuditableEntity {

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

}
