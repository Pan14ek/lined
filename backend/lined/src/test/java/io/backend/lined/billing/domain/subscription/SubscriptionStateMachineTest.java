package io.backend.lined.billing.domain.subscription;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.backend.lined.common.exception.ConflictException;
import java.util.Arrays;
import java.util.stream.Stream;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

class SubscriptionStateMachineTest {

  @ParameterizedTest
  @MethodSource("validTransitions")
  void assertTransition_returnsExpectedTarget_forEveryValidTransition(
      SubscriptionStatus from, SubscriptionEvent event, SubscriptionStatus expected) {
    assertThat(SubscriptionStateMachine.assertTransition(from, event)).isEqualTo(expected);
  }

  @ParameterizedTest
  @MethodSource("invalidTransitions")
  void assertTransition_throwsProviderStateConflict_forIllegalTransition(
      SubscriptionStatus from, SubscriptionEvent event) {
    assertThatThrownBy(() -> SubscriptionStateMachine.assertTransition(from, event))
        .isInstanceOfSatisfying(ConflictException.class,
            exception -> assertThat(exception.getCode()).isEqualTo("PROVIDER_STATE_CONFLICT"));
  }

  private static Stream<Arguments> validTransitions() {
    return Stream.of(
        transition(SubscriptionStatus.PENDING, SubscriptionEvent.PAYMENT_CONFIRMED,
            SubscriptionStatus.ACTIVE),
        transition(SubscriptionStatus.PENDING, SubscriptionEvent.PROVIDER_EXPIRED,
            SubscriptionStatus.EXPIRED),
        transition(SubscriptionStatus.ACTIVE, SubscriptionEvent.CANCELLATION_SCHEDULED,
            SubscriptionStatus.ACTIVE),
        transition(SubscriptionStatus.ACTIVE, SubscriptionEvent.CANCELLATION_RESUMED,
            SubscriptionStatus.ACTIVE),
        transition(SubscriptionStatus.ACTIVE, SubscriptionEvent.PRICE_CHANGE_SCHEDULED,
            SubscriptionStatus.ACTIVE),
        transition(SubscriptionStatus.ACTIVE, SubscriptionEvent.PAYMENT_FAILED,
            SubscriptionStatus.PAST_DUE),
        transition(SubscriptionStatus.ACTIVE, SubscriptionEvent.PERIOD_ELAPSED,
            SubscriptionStatus.CANCELED),
        transition(SubscriptionStatus.ACTIVE, SubscriptionEvent.PROVIDER_EXPIRED,
            SubscriptionStatus.EXPIRED),
        transition(SubscriptionStatus.PAST_DUE, SubscriptionEvent.PAYMENT_RECOVERED,
            SubscriptionStatus.ACTIVE),
        transition(SubscriptionStatus.PAST_DUE, SubscriptionEvent.PERIOD_ELAPSED,
            SubscriptionStatus.EXPIRED),
        transition(SubscriptionStatus.PAST_DUE, SubscriptionEvent.PROVIDER_EXPIRED,
            SubscriptionStatus.EXPIRED),
        transition(SubscriptionStatus.CANCELED, SubscriptionEvent.NEW_CHECKOUT,
            SubscriptionStatus.PENDING),
        transition(SubscriptionStatus.EXPIRED, SubscriptionEvent.NEW_CHECKOUT,
            SubscriptionStatus.PENDING));
  }

  private static Stream<Arguments> invalidTransitions() {
    return Arrays.stream(SubscriptionStatus.values())
        .flatMap(status -> Arrays.stream(SubscriptionEvent.values())
            .filter(event -> !isValid(status, event))
            .map(event -> Arguments.of(status, event)));
  }

  private static Arguments transition(SubscriptionStatus from, SubscriptionEvent event,
                                      SubscriptionStatus expected) {
    return Arguments.of(from, event, expected);
  }

  private static boolean isValid(SubscriptionStatus status, SubscriptionEvent event) {
    return switch (status) {
      case PENDING -> event == SubscriptionEvent.PAYMENT_CONFIRMED
          || event == SubscriptionEvent.PROVIDER_EXPIRED;
      case ACTIVE -> event == SubscriptionEvent.CANCELLATION_SCHEDULED
          || event == SubscriptionEvent.CANCELLATION_RESUMED
          || event == SubscriptionEvent.PRICE_CHANGE_SCHEDULED
          || event == SubscriptionEvent.PAYMENT_FAILED
          || event == SubscriptionEvent.PERIOD_ELAPSED
          || event == SubscriptionEvent.PROVIDER_EXPIRED;
      case PAST_DUE -> event == SubscriptionEvent.PAYMENT_RECOVERED
          || event == SubscriptionEvent.PERIOD_ELAPSED
          || event == SubscriptionEvent.PROVIDER_EXPIRED;
      case CANCELED, EXPIRED -> event == SubscriptionEvent.NEW_CHECKOUT;
    };
  }
}
