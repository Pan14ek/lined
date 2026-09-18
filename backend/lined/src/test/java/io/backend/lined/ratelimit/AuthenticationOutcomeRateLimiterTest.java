package io.backend.lined.ratelimit;

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
class AuthenticationOutcomeRateLimiterTest {

  private static final String POLICY_NAME = "login-failed-identifier";
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

  private AuthenticationOutcomeRateLimiter limiter;
  private RateLimitPolicy policy;

  @BeforeEach
  void setUp() {
    limiter = new AuthenticationOutcomeRateLimiter(properties, keyFactory, store, metrics);
    policy = new RateLimitPolicy(POLICY_NAME, 10, Duration.ofMinutes(15));
  }

  private void stubValidIdentifier() {
    when(keyFactory.normalizeIdentifier(IDENTIFIER)).thenReturn(IDENTIFIER);
    when(keyFactory.identifierKey(IDENTIFIER)).thenReturn(KEY);
    when(properties.policy(POLICY_NAME)).thenReturn(policy);
  }

  @Test
  void invalidIdentifierIsIgnored() {
    when(keyFactory.normalizeIdentifier(" ")).thenReturn(null);

    limiter.recordFailure(" ");

    verifyNoInteractions(store, properties, metrics);
  }

  @Test
  void allowedFailureRecordsAllowedDecision() {
    stubValidIdentifier();
    when(store.tryConsume(policy, KEY)).thenReturn(new RateLimitDecision(true, 0));

    limiter.recordFailure(IDENTIFIER);

    verify(metrics).allowed(POLICY_NAME);
  }

  @Test
  void rejectedFailureThrowsWithRetryDelay() {
    stubValidIdentifier();
    when(store.tryConsume(policy, KEY))
        .thenReturn(new RateLimitDecision(false, Duration.ofSeconds(4).toNanos()));

    assertThatThrownBy(() -> limiter.recordFailure(IDENTIFIER))
        .isInstanceOf(RateLimitExceededException.class)
        .extracting("retryAfterSeconds")
        .isEqualTo(4L);
    verify(metrics).rejected(POLICY_NAME);
  }

  @Test
  void storageFailureFailsClosed() {
    stubValidIdentifier();
    when(store.tryConsume(policy, KEY))
        .thenThrow(new RateLimitStorageException("capacity exhausted"));

    assertThatThrownBy(() -> limiter.recordFailure(IDENTIFIER))
        .isInstanceOf(RateLimitUnavailableException.class);
    verify(metrics).storageFailure("capacity");
    verify(metrics).unavailable(POLICY_NAME);
  }

  @Test
  void successfulAuthenticationClearsIdentifierBucket() {
    stubValidIdentifier();
    limiter.recordSuccess(IDENTIFIER);

    verify(store).remove(policy, KEY);
  }

  @Test
  void invalidSuccessfulAuthenticationDoesNotTouchStore() {
    when(keyFactory.normalizeIdentifier(" ")).thenReturn(null);

    limiter.recordSuccess(" ");

    verifyNoInteractions(store, properties);
  }
}
