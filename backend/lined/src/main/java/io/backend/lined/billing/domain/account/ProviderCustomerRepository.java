package io.backend.lined.billing.domain.account;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Persistence boundary for mappings from local billing accounts to provider customers.
 *
 * <p>For example, {@code findByBillingAccountIdAndProvider(17L, "sandbox")} returns the one
 * sandbox customer mapping for account {@code 17}, or no mapping before checkout has created it.</p>
 */
@Repository
public interface ProviderCustomerRepository extends JpaRepository<ProviderCustomerEntity, Long> {

  /**
   * Finds the provider customer associated with one account at one provider.
   *
   * <p>For example, a retry of checkout for account {@code 17} can reuse the returned mapping
   * instead of creating another provider customer.</p>
   *
   * @param billingAccountId local billing-account identifier
   * @param provider stable provider name, such as {@code sandbox}
   * @return the existing mapping, or an empty result when none has been created
   */
  Optional<ProviderCustomerEntity> findByBillingAccountIdAndProvider(Long billingAccountId,
                                                                       String provider);
}
