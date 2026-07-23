package io.backend.lined.billing.application;

import java.util.Optional;
import org.springframework.stereotype.Component;

@Component
public class NoOpPaidSubscriptionLookup implements PaidSubscriptionLookupPort {

  @Override
  public Optional<PaidSubscription> findCurrentByBillingAccountId(Long billingAccountId) {
    return Optional.empty();
  }
}
