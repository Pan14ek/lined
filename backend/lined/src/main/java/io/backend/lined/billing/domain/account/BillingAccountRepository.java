package io.backend.lined.billing.domain.account;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
/**
 * Persistence boundary for billing-account aggregates.
 *
 * <p>Example: {@code findByOwnerUserIdAndType(42L, PERSONAL)} locates the sole personal account
 * belonging to user {@code 42}, if it has already been provisioned.</p>
 */
public interface BillingAccountRepository extends JpaRepository<BillingAccountEntity, Long> {

  /**
   * Finds one account by its owner and account type.
   *
   * @param ownerUserId identifier of the user who owns the account
   * @param type account category, currently {@code PERSONAL}
   * @return the matching account, or an empty result when provisioning has not occurred
   */
  Optional<BillingAccountEntity> findByOwnerUserIdAndType(
      Long ownerUserId, BillingAccountType type);
}
