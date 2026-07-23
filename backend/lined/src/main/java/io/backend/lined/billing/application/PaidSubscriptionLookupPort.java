package io.backend.lined.billing.application;

import java.util.Optional;

public interface PaidSubscriptionLookupPort {

  Optional<PaidSubscription> findCurrentByBillingAccountId(Long billingAccountId);
}
