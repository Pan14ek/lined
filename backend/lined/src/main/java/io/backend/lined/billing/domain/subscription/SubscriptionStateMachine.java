package io.backend.lined.billing.domain.subscription;

import io.backend.lined.common.exception.ConflictException;
import java.util.EnumMap;
import java.util.Map;

/**
 * Pure validator for the canonical provider-subscription lifecycle.
 *
 * <p>For example, {@code assertTransition(ACTIVE, PAYMENT_FAILED)} returns {@code PAST_DUE};
 * {@code assertTransition(CANCELED, PAYMENT_FAILED)} throws a conflict because a canceled
 * subscription cannot fail a renewal. Callers persist the returned state in their own transaction
 * after a verified provider event or command has supplied the event.</p>
 */
public final class SubscriptionStateMachine {

  private static final Map<SubscriptionStatus, Map<SubscriptionEvent, SubscriptionStatus>>
      TRANSITIONS = transitions();

  private SubscriptionStateMachine() {
  }

  /**
   * Returns the destination state for a permitted lifecycle event.
   *
   * <p>For example, an elapsed paid period with a scheduled cancellation maps
   * {@code ACTIVE + PERIOD_ELAPSED} to {@code CANCELED}; an elapsed grace period maps
   * {@code PAST_DUE + PERIOD_ELAPSED} to {@code EXPIRED}.</p>
   *
   * @param from current canonical subscription status
   * @param event verified provider or product event being applied
   * @return the canonical status after applying {@code event}
   * @throws ConflictException when the event is illegal for {@code from}; its code is always
   *     {@code PROVIDER_STATE_CONFLICT}
   */
  public static SubscriptionStatus assertTransition(SubscriptionStatus from,
                                                     SubscriptionEvent event) {
    SubscriptionStatus target = TRANSITIONS.getOrDefault(from, Map.of()).get(event);
    if (target == null) {
      throw new ConflictException(
          "PROVIDER_STATE_CONFLICT",
          "Cannot apply %s while subscription is %s".formatted(event, from));
    }
    return target;
  }

  private static Map<SubscriptionStatus, Map<SubscriptionEvent, SubscriptionStatus>> transitions() {
    Map<SubscriptionStatus, Map<SubscriptionEvent, SubscriptionStatus>> transitions =
        new EnumMap<>(SubscriptionStatus.class);
    transitions.put(SubscriptionStatus.PENDING, Map.of(
        SubscriptionEvent.PAYMENT_CONFIRMED, SubscriptionStatus.ACTIVE,
        SubscriptionEvent.PROVIDER_EXPIRED, SubscriptionStatus.EXPIRED));
    transitions.put(SubscriptionStatus.ACTIVE, Map.of(
        SubscriptionEvent.CANCELLATION_SCHEDULED, SubscriptionStatus.ACTIVE,
        SubscriptionEvent.CANCELLATION_RESUMED, SubscriptionStatus.ACTIVE,
        SubscriptionEvent.PRICE_CHANGE_SCHEDULED, SubscriptionStatus.ACTIVE,
        SubscriptionEvent.PAYMENT_FAILED, SubscriptionStatus.PAST_DUE,
        SubscriptionEvent.PERIOD_ELAPSED, SubscriptionStatus.CANCELED,
        SubscriptionEvent.PROVIDER_EXPIRED, SubscriptionStatus.EXPIRED));
    transitions.put(SubscriptionStatus.PAST_DUE, Map.of(
        SubscriptionEvent.PAYMENT_RECOVERED, SubscriptionStatus.ACTIVE,
        SubscriptionEvent.PERIOD_ELAPSED, SubscriptionStatus.EXPIRED,
        SubscriptionEvent.PROVIDER_EXPIRED, SubscriptionStatus.EXPIRED));
    transitions.put(SubscriptionStatus.CANCELED,
        Map.of(SubscriptionEvent.NEW_CHECKOUT, SubscriptionStatus.PENDING));
    transitions.put(SubscriptionStatus.EXPIRED,
        Map.of(SubscriptionEvent.NEW_CHECKOUT, SubscriptionStatus.PENDING));
    return Map.copyOf(transitions);
  }
}
