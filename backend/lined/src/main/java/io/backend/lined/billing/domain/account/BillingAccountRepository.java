package io.backend.lined.billing.domain.account;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BillingAccountRepository extends JpaRepository<BillingAccountEntity, Long> {

  Optional<BillingAccountEntity> findByOwnerUserIdAndType(
      Long ownerUserId, BillingAccountType type);
}
