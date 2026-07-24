package io.backend.lined.billing.domain.subscription;

import io.backend.lined.billing.domain.account.BillingAccountEntity;
import io.backend.lined.billing.domain.common.BillingAuditableEntity;
import io.backend.lined.billing.domain.plan.PlanCode;
import io.backend.lined.billing.domain.plan.PriceCode;
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
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Local projection of one provider-backed paid subscription.
 *
 * <p>For example, an account can hold an {@link SubscriptionStatus#ACTIVE} {@code PRO} monthly
 * subscription whose {@code currentPeriodEnd} came from the provider. Product access reads this
 * projection but still evaluates its provider-canonical period and grace timestamps at request
 * time.</p>
 */
@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = false)
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Entity
@Table(name = "billing_subscriptions")
public class SubscriptionEntity extends BillingAuditableEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @EqualsAndHashCode.Include
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "billing_account_id", nullable = false)
  private BillingAccountEntity billingAccount;

  @Column(nullable = false, length = 32)
  private String provider;

  @Column(name = "provider_subscription_id", nullable = false, length = 128)
  private String providerSubscriptionId;

  @Enumerated(EnumType.STRING)
  @Column(name = "plan_code", nullable = false, length = 16)
  private PlanCode planCode;

  @Enumerated(EnumType.STRING)
  @Column(name = "current_price_code", nullable = false, length = 32)
  private PriceCode currentPriceCode;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private SubscriptionStatus status;

  @Column(name = "current_period_start", nullable = false)
  private Instant currentPeriodStart;

  @Column(name = "current_period_end", nullable = false)
  private Instant currentPeriodEnd;

  @Column(name = "cancel_at_period_end", nullable = false)
  private boolean cancelAtPeriodEnd;

  @Enumerated(EnumType.STRING)
  @Column(name = "scheduled_price_code", length = 32)
  private PriceCode scheduledPriceCode;

  @Column(name = "scheduled_change_at")
  private Instant scheduledChangeAt;

  @Column(name = "past_due_since")
  private Instant pastDueSince;

  @Column(name = "grace_ends_at")
  private Instant graceEndsAt;

  @Column(name = "provider_updated_at", nullable = false)
  private Instant providerUpdatedAt;

  @Column(name = "last_synced_at")
  private Instant lastSyncedAt;

  @Version
  @Column(nullable = false)
  private long version;

}
