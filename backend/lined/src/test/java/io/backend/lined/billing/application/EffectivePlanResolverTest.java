package io.backend.lined.billing.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import io.backend.lined.billing.domain.plan.PlanCode;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class EffectivePlanResolverTest {

  private static final long BILLING_ACCOUNT_ID = 1L;
  private static final Instant NOW = Instant.parse("2026-07-23T12:00:00Z");

  @Mock
  private PaidSubscriptionLookupPort paidSubscriptionLookup;

  @InjectMocks
  private EffectivePlanResolver resolver;

  @Test
  void resolve_returnsFree_whenNoPaidSubscriptionExists() {
    when(paidSubscriptionLookup.findCurrentByBillingAccountId(BILLING_ACCOUNT_ID))
        .thenReturn(Optional.empty());

    assertThat(resolver.resolve(BILLING_ACCOUNT_ID, NOW)).isEqualTo(PlanCode.FREE);
  }

  @Test
  void resolve_returnsFree_whenPaidSubscriptionIsExpired() {
    PaidSubscription expired = new PaidSubscription(PlanCode.PRO, NOW.minusSeconds(1));
    when(paidSubscriptionLookup.findCurrentByBillingAccountId(BILLING_ACCOUNT_ID))
        .thenReturn(Optional.of(expired));

    assertThat(resolver.resolve(BILLING_ACCOUNT_ID, NOW)).isEqualTo(PlanCode.FREE);
  }

  @Test
  void resolve_returnsPro_whenPaidSubscriptionIsCurrent() {
    PaidSubscription active = new PaidSubscription(PlanCode.PRO, NOW.plusSeconds(1));
    when(paidSubscriptionLookup.findCurrentByBillingAccountId(BILLING_ACCOUNT_ID))
        .thenReturn(Optional.of(active));

    assertThat(resolver.resolve(BILLING_ACCOUNT_ID, NOW)).isEqualTo(PlanCode.PRO);
  }
}
