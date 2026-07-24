package io.backend.lined.auth.service;

import static org.assertj.core.api.Assertions.assertThat;

import io.backend.lined.auth.api.PasswordResetDto;
import io.backend.lined.common.exception.BadRequestException;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * PostgreSQL regression proof that a reset token cannot change two passwords concurrently.
 *
 * <p>For example, two workers begin independent transactions, wait at the same barrier, and then
 * submit one raw token with different replacement passwords. The expected result is one success,
 * one generic invalid-token failure, one consumed row, and a stored password matching only the
 * winning worker.</p>
 */
@SpringBootTest
@Testcontainers(disabledWithoutDocker = true)
class PasswordResetServiceConcurrencyTest {

  private static final String HMAC_ALGORITHM = "HmacSHA256";
  private static final String TOKEN_SECRET = "password-reset-concurrency-test-secret";
  private static final String RAW_TOKEN = "same-single-use-token";
  private static final String FIRST_PASSWORD = "FirstResetPassword!";
  private static final String SECOND_PASSWORD = "SecondResetPassword!";
  private static final long USER_ID = 1L;

  @Container
  private static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16-alpine");

  @Autowired
  private JdbcTemplate jdbcTemplate;

  @Autowired
  private PasswordEncoder passwordEncoder;

  @Autowired
  private PasswordResetService passwordResetService;

  @Autowired
  private PlatformTransactionManager transactionManager;

  @DynamicPropertySource
  static void postgresProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
    registry.add("spring.datasource.username", POSTGRES::getUsername);
    registry.add("spring.datasource.password", POSTGRES::getPassword);
    registry.add("lined.auth.reset-token-secret", () -> TOKEN_SECRET);
  }

  @BeforeEach
  void setUp() {
    truncateTables();
    jdbcTemplate.update("""
        insert into users (id, username, email, password, version, created_at)
        values (?, 'reset-user', 'reset@example.com', 'old-password', 0, now())
        """, USER_ID);
    jdbcTemplate.update("""
        insert into password_reset_tokens (user_id, token_hash, expires_at, created_at)
        values (?, ?, ?, now())
        """, USER_ID, hash(RAW_TOKEN), OffsetDateTime.now().plusMinutes(10));
  }

  @AfterEach
  void tearDown() {
    truncateTables();
  }

  /**
   * Proves the conditional claim has exactly one winner under concurrent PostgreSQL transactions.
   *
   * <p>For example, {@code FirstResetPassword!} and {@code SecondResetPassword!} race to redeem
   * {@link #RAW_TOKEN}; the final assertion derives the winning attempt and verifies that only its
   * encoded password is persisted.</p>
   *
   * @throws Exception when the executor or latch cannot complete within its bounded timeout
   */
  @Test
  void reset_allowsExactlyOneConcurrentRedemptionOfTheSameToken() throws Exception {
    ExecutorService executor = Executors.newFixedThreadPool(2);
    try {
      CountDownLatch ready = new CountDownLatch(2);
      CountDownLatch release = new CountDownLatch(1);
      Future<AttemptResult> first = executor.submit(
          () -> attempt(FIRST_PASSWORD, ready, release));
      Future<AttemptResult> second = executor.submit(
          () -> attempt(SECOND_PASSWORD, ready, release));

      assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
      release.countDown();

      List<AttemptResult> attempts = List.of(first.get(10, TimeUnit.SECONDS),
          second.get(10, TimeUnit.SECONDS));
      assertThat(attempts).filteredOn(AttemptResult::succeeded).hasSize(1);
      assertThat(attempts).filteredOn(result -> result.failure() instanceof BadRequestException)
          .hasSize(1);

      AttemptResult winner = attempts.stream().filter(AttemptResult::succeeded).findFirst()
          .orElseThrow();
      String password = jdbcTemplate.queryForObject(
          "select password from users where id = ?", String.class, USER_ID);
      Integer usedTokenCount = jdbcTemplate.queryForObject(
          "select count(*) from password_reset_tokens where used_at is not null", Integer.class);

      assertThat(usedTokenCount).isEqualTo(1);
      assertThat(passwordEncoder.matches(winner.password(), password)).isTrue();
      assertThat(passwordEncoder.matches(losingPassword(winner.password()), password)).isFalse();
    } finally {
      executor.shutdownNow();
    }
  }

  private AttemptResult attempt(String password, CountDownLatch ready, CountDownLatch release) {
    try {
      return new TransactionTemplate(transactionManager).execute(status -> {
        ready.countDown();
        await(release);
        passwordResetService.reset(new PasswordResetDto(RAW_TOKEN, password));
        return new AttemptResult(password, null);
      });
    } catch (RuntimeException ex) {
      return new AttemptResult(password, ex);
    }
  }

  private void await(CountDownLatch latch) {
    try {
      if (!latch.await(5, TimeUnit.SECONDS)) {
        throw new IllegalStateException("Timed out waiting for concurrent reset attempts");
      }
    } catch (InterruptedException ex) {
      Thread.currentThread().interrupt();
      throw new IllegalStateException("Interrupted while waiting for concurrent reset attempts", ex);
    }
  }

  private String hash(String token) {
    try {
      Mac mac = Mac.getInstance(HMAC_ALGORITHM);
      mac.init(new SecretKeySpec(TOKEN_SECRET.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM));
      return Base64.getUrlEncoder().withoutPadding().encodeToString(
          mac.doFinal(token.getBytes(StandardCharsets.UTF_8)));
    } catch (GeneralSecurityException ex) {
      throw new IllegalStateException("Unable to hash reset token", ex);
    }
  }

  private String losingPassword(String winningPassword) {
    return winningPassword.equals(FIRST_PASSWORD) ? SECOND_PASSWORD : FIRST_PASSWORD;
  }

  private void truncateTables() {
    jdbcTemplate.execute("truncate table password_reset_tokens, users restart identity cascade");
  }

  private record AttemptResult(String password, Throwable failure) {

    private boolean succeeded() {
      return failure == null;
    }
  }
}
