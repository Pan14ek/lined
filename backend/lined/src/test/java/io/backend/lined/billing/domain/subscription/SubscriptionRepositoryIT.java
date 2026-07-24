package io.backend.lined.billing.domain.subscription;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.backend.lined.billing.domain.account.BillingAccountEntity;
import io.backend.lined.billing.domain.account.BillingAccountRepository;
import io.backend.lined.billing.domain.account.BillingAccountStatus;
import io.backend.lined.billing.domain.account.BillingAccountType;
import io.backend.lined.billing.domain.plan.PlanCode;
import io.backend.lined.billing.domain.plan.PriceCode;
import java.time.Instant;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@Testcontainers(disabledWithoutDocker = true)
class SubscriptionRepositoryIT {

  private static final Instant PERIOD_START = Instant.parse("2026-07-01T00:00:00Z");
  private static final Instant PERIOD_END = Instant.parse("2026-08-01T00:00:00Z");

  @Container
  private static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16-alpine");

  @Autowired
  private BillingAccountRepository billingAccountRepository;

  @Autowired
  private JdbcTemplate jdbcTemplate;

  @Autowired
  private SubscriptionRepository subscriptionRepository;

  @Autowired
  private PlatformTransactionManager transactionManager;

  @DynamicPropertySource
  static void postgresProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
    registry.add("spring.datasource.username", POSTGRES::getUsername);
    registry.add("spring.datasource.password", POSTGRES::getPassword);
  }

  @BeforeEach
  void setUp() {
    jdbcTemplate.execute("truncate table billing_subscriptions, billing_accounts, users cascade");
  }

  @AfterEach
  void tearDown() {
    jdbcTemplate.execute("truncate table billing_subscriptions, billing_accounts, users cascade");
  }

  @Test
  void save_rejectsDuplicateProviderSubscriptionId() {
    long firstAccountId = accountId("first-provider-id");
    long secondAccountId = accountId("second-provider-id");
    subscriptionRepository.saveAndFlush(subscription(firstAccountId, "sub_shared", SubscriptionStatus.ACTIVE));

    assertThatThrownBy(() -> subscriptionRepository.saveAndFlush(
        subscription(secondAccountId, "sub_shared", SubscriptionStatus.ACTIVE)))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  @Test
  void save_allowsTerminalHistoryButRejectsSecondNonTerminalSubscription() {
    long billingAccountId = accountId("subscription-states");
    subscriptionRepository.saveAndFlush(
        subscription(billingAccountId, "sub_canceled", SubscriptionStatus.CANCELED));
    subscriptionRepository.saveAndFlush(
        subscription(billingAccountId, "sub_active", SubscriptionStatus.ACTIVE));

    assertThat(subscriptionRepository.findCurrentByBillingAccountId(billingAccountId))
        .map(SubscriptionEntity::getProviderSubscriptionId)
        .contains("sub_active");
    assertThatThrownBy(() -> subscriptionRepository.saveAndFlush(
        subscription(billingAccountId, "sub_pending", SubscriptionStatus.PENDING)))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  @Test
  void save_rejectsSecondNonTerminalSubscription_whenExistingSubscriptionIsPastDue() {
    long billingAccountId = accountId("past-due-subscription");
    subscriptionRepository.saveAndFlush(
        subscription(billingAccountId, "sub_past_due", SubscriptionStatus.PAST_DUE));

    assertThatThrownBy(() -> subscriptionRepository.saveAndFlush(
        subscription(billingAccountId, "sub_second_active", SubscriptionStatus.ACTIVE)))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  @Test
  void save_rejectsInvalidPeriodScheduledChangeAndGraceState() {
    SubscriptionEntity invalidPeriod = subscription(
        accountId("invalid-period"), "sub_invalid_period", SubscriptionStatus.ACTIVE);
    invalidPeriod.setCurrentPeriodEnd(PERIOD_START.minusSeconds(1));
    assertRejected(invalidPeriod);

    SubscriptionEntity invalidSchedule = subscription(
        accountId("invalid-schedule"), "sub_invalid_schedule", SubscriptionStatus.ACTIVE);
    invalidSchedule.setScheduledPriceCode(PriceCode.PRO_YEARLY);
    assertRejected(invalidSchedule);

    SubscriptionEntity invalidGrace = subscription(
        accountId("invalid-grace"), "sub_invalid_grace", SubscriptionStatus.ACTIVE);
    invalidGrace.setPastDueSince(PERIOD_START);
    assertRejected(invalidGrace);
  }

  @Test
  void concurrentUpdates_allowOneWinnerAndRejectTheStaleWriter() throws Exception {
    long subscriptionId = subscriptionRepository.saveAndFlush(
        subscription(accountId("optimistic-lock"), "sub_lock", SubscriptionStatus.ACTIVE)).getId();

    RaceResult result = updateRace(subscriptionId);

    assertThat(result.successes()).isEqualTo(1);
    assertThat(result.optimisticLockFailures()).isEqualTo(1);
    assertThat(subscriptionRepository.findById(subscriptionId)).hasValueSatisfying(
        subscription -> assertThat(subscription.getVersion()).isEqualTo(1L));
  }

  private long accountId(String username) {
    Long userId = jdbcTemplate.queryForObject("""
        insert into users (username, email, password)
        values (?, ?, 'password')
        returning id
        """, Long.class, username, username + "@example.com");
    BillingAccountEntity account = billingAccountRepository.saveAndFlush(BillingAccountEntity.builder()
        .ownerUserId(userId)
        .type(BillingAccountType.PERSONAL)
        .status(BillingAccountStatus.ACTIVE)
        .build());
    return account.getId();
  }

  private SubscriptionEntity subscription(long billingAccountId, String providerSubscriptionId,
                                          SubscriptionStatus status) {
    SubscriptionEntity.SubscriptionEntityBuilder builder = SubscriptionEntity.builder()
        .billingAccount(billingAccountRepository.getReferenceById(billingAccountId))
        .provider("sandbox")
        .providerSubscriptionId(providerSubscriptionId)
        .planCode(PlanCode.PRO)
        .currentPriceCode(PriceCode.PRO_MONTHLY)
        .status(status)
        .currentPeriodStart(PERIOD_START)
        .currentPeriodEnd(PERIOD_END)
        .providerUpdatedAt(PERIOD_START);
    if (status == SubscriptionStatus.PAST_DUE) {
      builder.pastDueSince(PERIOD_START).graceEndsAt(PERIOD_END);
    }
    return builder.build();
  }

  private void assertRejected(SubscriptionEntity subscription) {
    assertThatThrownBy(() -> subscriptionRepository.saveAndFlush(subscription))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  private RaceResult updateRace(long subscriptionId) throws Exception {
    ExecutorService executor = Executors.newFixedThreadPool(2);
    try {
      CountDownLatch ready = new CountDownLatch(2);
      CountDownLatch release = new CountDownLatch(1);
      Future<Throwable> first = executor.submit(() -> update(subscriptionId, ready, release));
      Future<Throwable> second = executor.submit(() -> update(subscriptionId, ready, release));
      assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
      release.countDown();
      return RaceResult.from(first.get(10, TimeUnit.SECONDS), second.get(10, TimeUnit.SECONDS));
    } finally {
      executor.shutdownNow();
    }
  }

  private Throwable update(long subscriptionId, CountDownLatch ready, CountDownLatch release) {
    try {
      new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
        SubscriptionEntity subscription = subscriptionRepository.findById(subscriptionId).orElseThrow();
        ready.countDown();
        await(release);
        subscription.setLastSyncedAt(Instant.now());
        subscriptionRepository.saveAndFlush(subscription);
      });
      return null;
    } catch (RuntimeException exception) {
      return exception;
    }
  }

  private void await(CountDownLatch release) {
    try {
      if (!release.await(5, TimeUnit.SECONDS)) {
        throw new IllegalStateException("Timed out waiting for concurrent update release");
      }
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
      throw new IllegalStateException("Interrupted while waiting for concurrent update release", exception);
    }
  }

  private record RaceResult(int successes, int optimisticLockFailures) {

    private static RaceResult from(Throwable first, Throwable second) {
      int successes = first == null ? 1 : 0;
      successes += second == null ? 1 : 0;
      int failures = isOptimisticLockFailure(first) ? 1 : 0;
      failures += isOptimisticLockFailure(second) ? 1 : 0;
      return new RaceResult(successes, failures);
    }

    private static boolean isOptimisticLockFailure(Throwable throwable) {
      return throwable instanceof OptimisticLockingFailureException;
    }
  }
}
