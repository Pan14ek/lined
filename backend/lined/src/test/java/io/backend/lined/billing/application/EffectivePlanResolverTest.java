package io.backend.lined.billing.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import io.backend.lined.billing.domain.plan.PlanCode;
import io.backend.lined.billing.domain.subscription.SubscriptionStatus;
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
    PaidSubscription expired = subscription(
        SubscriptionStatus.ACTIVE, NOW.minusSeconds(1), false, null);
    when(paidSubscriptionLookup.findCurrentByBillingAccountId(BILLING_ACCOUNT_ID))
        .thenReturn(Optional.of(expired));

    assertThat(resolver.resolve(BILLING_ACCOUNT_ID, NOW)).isEqualTo(PlanCode.FREE);
  }

  @Test
  void resolve_returnsPro_whenPaidSubscriptionIsCurrent() {
    PaidSubscription active = subscription(
        SubscriptionStatus.ACTIVE, NOW.plusSeconds(1), false, null);
    when(paidSubscriptionLookup.findCurrentByBillingAccountId(BILLING_ACCOUNT_ID))
        .thenReturn(Optional.of(active));

    assertThat(resolver.resolve(BILLING_ACCOUNT_ID, NOW)).isEqualTo(PlanCode.PRO);
  }

  @Test
  void resolve_returnsPro_whenActiveSubscriptionHasCancellationScheduled() {
    stub(subscription(SubscriptionStatus.ACTIVE, NOW.plusSeconds(1), true, null));

    assertThat(resolver.resolve(BILLING_ACCOUNT_ID, NOW)).isEqualTo(PlanCode.PRO);
  }

  @Test
  void resolve_returnsPro_whenPastDueSubscriptionIsWithinGrace() {
    stub(subscription(
        SubscriptionStatus.PAST_DUE, NOW.minusSeconds(1), false, NOW.plusSeconds(1)));

    assertThat(resolver.resolve(BILLING_ACCOUNT_ID, NOW)).isEqualTo(PlanCode.PRO);
  }

  @Test
  void resolve_returnsFree_whenPastDueGraceEndsAtNow() {
    stub(subscription(SubscriptionStatus.PAST_DUE, NOW.plusSeconds(1), false, NOW));

    assertThat(resolver.resolve(BILLING_ACCOUNT_ID, NOW)).isEqualTo(PlanCode.FREE);
  }

  @Test
  void resolve_returnsFree_whenPastDueSubscriptionHasNoGraceEnd() {
    stub(subscription(SubscriptionStatus.PAST_DUE, NOW.plusSeconds(1), false, null));

    assertThat(resolver.resolve(BILLING_ACCOUNT_ID, NOW)).isEqualTo(PlanCode.FREE);
  }

  @Test
  void resolve_returnsFree_whenSubscriptionIsPending() {
    stub(subscription(SubscriptionStatus.PENDING, NOW.plusSeconds(1), false, null));

    assertThat(resolver.resolve(BILLING_ACCOUNT_ID, NOW)).isEqualTo(PlanCode.FREE);
  }

  @Test
  void resolve_returnsFree_whenSubscriptionIsCanceled() {
    stub(subscription(SubscriptionStatus.CANCELED, NOW.plusSeconds(1), false, null));

    assertThat(resolver.resolve(BILLING_ACCOUNT_ID, NOW)).isEqualTo(PlanCode.FREE);
  }

  @Test
  void resolve_returnsFree_whenSubscriptionIsExpired() {
    stub(subscription(SubscriptionStatus.EXPIRED, NOW.plusSeconds(1), false, null));

    assertThat(resolver.resolve(BILLING_ACCOUNT_ID, NOW)).isEqualTo(PlanCode.FREE);
  }

  private PaidSubscription subscription(SubscriptionStatus status, Instant periodEnd,
                                        boolean cancelAtPeriodEnd, Instant graceEndsAt) {
    return new PaidSubscription(PlanCode.PRO, status, periodEnd, cancelAtPeriodEnd, graceEndsAt);
  }

  private void stub(PaidSubscription subscription) {
    when(paidSubscriptionLookup.findCurrentByBillingAccountId(BILLING_ACCOUNT_ID))
        .thenReturn(Optional.of(subscription));
  }
}
