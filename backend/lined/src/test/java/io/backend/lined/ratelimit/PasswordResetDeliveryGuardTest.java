package io.backend.lined.ratelimit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Duration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PasswordResetDeliveryGuardTest {

  private static final String POLICY_NAME = "reset-delivery-identifier";
  private static final String IDENTIFIER = "alice@example.com";
  private static final String KEY = "identifier-key";

  @Mock
  private RateLimitProperties properties;
  @Mock
  private RateLimitKeyFactory keyFactory;
  @Mock
  private RateLimitStore store;
  @Mock
  private RateLimitMetrics metrics;

  private PasswordResetDeliveryGuard guard;
  private RateLimitPolicy policy;

  @BeforeEach
  void setUp() {
    guard = new PasswordResetDeliveryGuard(properties, keyFactory, store, metrics);
    policy = new RateLimitPolicy(POLICY_NAME, 3, Duration.ofHours(1));
  }

  private void stubValidIdentifier() {
    when(keyFactory.normalizeIdentifier(IDENTIFIER)).thenReturn(IDENTIFIER);
    when(keyFactory.identifierKey(IDENTIFIER)).thenReturn(KEY);
    when(properties.policy(POLICY_NAME)).thenReturn(policy);
  }

  @Test
  void invalidIdentifierIsSuppressedWithoutStoreAccess() {
    when(keyFactory.normalizeIdentifier(" ")).thenReturn(null);

    assertThat(guard.mayDeliver(" ")).isFalse();
    verifyNoInteractions(store, properties, metrics);
  }

  @Test
  void availableBudgetAllowsDelivery() {
    stubValidIdentifier();
    when(store.tryConsume(policy, KEY)).thenReturn(new RateLimitDecision(true, 0));

    assertThat(guard.mayDeliver(IDENTIFIER)).isTrue();
    verify(metrics).allowed(POLICY_NAME);
  }

  @Test
  void exhaustedBudgetSuppressesDelivery() {
    stubValidIdentifier();
    when(store.tryConsume(policy, KEY)).thenReturn(new RateLimitDecision(false, 1));

    assertThat(guard.mayDeliver(IDENTIFIER)).isFalse();
    verify(metrics).suppressed(POLICY_NAME);
  }

  @Test
  void storageFailureFailsClosed() {
    stubValidIdentifier();
    when(store.tryConsume(policy, KEY))
        .thenThrow(new RateLimitStorageException("capacity exhausted"));

    assertThatThrownBy(() -> guard.mayDeliver(IDENTIFIER))
        .isInstanceOf(RateLimitUnavailableException.class);
    verify(metrics).storageFailure("capacity");
    verify(metrics).unavailable(POLICY_NAME);
  }
}
