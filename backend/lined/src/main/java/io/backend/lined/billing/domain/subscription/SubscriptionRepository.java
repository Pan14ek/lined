package io.backend.lined.billing.domain.subscription;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Persistence boundary for provider-backed subscription projections.
 *
 * <p>For example, {@link #findCurrentByBillingAccountId(Long)} returns the one pending, active,
 * or past-due projection for account {@code 17}; the PostgreSQL partial unique index enforces
 * that this query can never produce two non-terminal rows.</p>
 */
@Repository
public interface SubscriptionRepository extends JpaRepository<SubscriptionEntity, Long> {

  /**
   * Finds an account's current non-terminal subscription projection.
   *
   * <p>For example, an active Pro row is returned for entitlement resolution, while a canceled
   * historical row is ignored and returns an empty result when it is the only row.</p>
   *
   * @param billingAccountId local billing-account identifier
   * @return a pending, active, or past-due subscription when one exists
   */
  @Query("""
      select subscription
      from SubscriptionEntity subscription
      where subscription.billingAccount.id = :billingAccountId
        and subscription.status in :statuses
      """)
  Optional<SubscriptionEntity> findCurrentByBillingAccountId(
      @Param("billingAccountId") Long billingAccountId,
      @Param("statuses") java.util.Collection<SubscriptionStatus> statuses);

  /**
   * Finds an account's current subscription using the canonical non-terminal states.
   *
   * <p>For example, passing account {@code 17} searches only {@code PENDING}, {@code ACTIVE},
   * and {@code PAST_DUE}; callers do not need to duplicate the lifecycle definition.</p>
   *
   * @param billingAccountId local billing-account identifier
   * @return the current subscription projection, if one exists
   */
  default Optional<SubscriptionEntity> findCurrentByBillingAccountId(Long billingAccountId) {
    return findCurrentByBillingAccountId(
        billingAccountId,
        java.util.List.of(
            SubscriptionStatus.PENDING, SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE));
  }
}
