package io.backend.lined.billing.domain.account;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.backend.lined.app.AccountApplicationService;
import io.backend.lined.user.api.UserCreateDto;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@Testcontainers(disabledWithoutDocker = true)
class BillingAccountRepositoryIT {

  @Container
  private static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16-alpine");

  @DynamicPropertySource
  static void postgresProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
    registry.add("spring.datasource.username", POSTGRES::getUsername);
    registry.add("spring.datasource.password", POSTGRES::getPassword);
  }

  @Autowired
  private AccountApplicationService accountApplicationService;

  @Autowired
  private BillingAccountRepository billingAccountRepository;

  @Autowired
  private JdbcTemplate jdbcTemplate;

  @BeforeEach
  void setUp() {
    jdbcTemplate.execute("truncate table billing_accounts, users cascade");
  }

  @AfterEach
  void tearDown() {
    jdbcTemplate.execute("drop trigger if exists fail_billing_account_insert on billing_accounts");
    jdbcTemplate.execute("drop function if exists fail_billing_account_insert()");
    jdbcTemplate.execute("truncate table billing_accounts, users cascade");
  }

  @Test
  void save_rejectsDuplicatePersonalAccountForOneUser() {
    long userId = insertUser("duplicate-owner");
    billingAccountRepository.saveAndFlush(personalAccount(userId));

    assertThatThrownBy(() -> billingAccountRepository.saveAndFlush(personalAccount(userId)))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  @Test
  void backfill_createsExactlyOnePersonalAccountPerExistingUser() {
    long firstUserId = insertUser("first-backfill");
    long secondUserId = insertUser("second-backfill");

    runBackfill();
    runBackfill();

    assertThat(countAccounts(firstUserId)).isEqualTo(1);
    assertThat(countAccounts(secondUserId)).isEqualTo(1);
  }

  @Test
  void registerUser_createsPersonalAccountWithoutLegacySubscriptionPersistence() {
    accountApplicationService.registerUser(new UserCreateDto(
        "billing-registration", "billing-registration@example.com", "password", Set.of()));

    assertThat(jdbcTemplate.queryForObject("select count(*) from billing_accounts", Integer.class))
        .isEqualTo(1);
  }

  @Test
  void registerUser_rollsBackUserWhenBillingAccountInsertFails() {
    jdbcTemplate.execute("""
        create function fail_billing_account_insert() returns trigger as $$
        begin
          raise exception 'billing account insert failed';
        end;
        $$ language plpgsql
        """);
    jdbcTemplate.execute("""
        create trigger fail_billing_account_insert
        before insert on billing_accounts
        for each row execute function fail_billing_account_insert()
        """);

    assertThatThrownBy(() -> accountApplicationService.registerUser(new UserCreateDto(
        "billing-rollback", "billing-rollback@example.com", "password", Set.of())))
        .isInstanceOf(RuntimeException.class);

    assertThat(jdbcTemplate.queryForObject(
        "select count(*) from users where username = 'billing-rollback'", Integer.class)).isZero();
  }

  private long insertUser(String username) {
    return jdbcTemplate.queryForObject("""
        insert into users (username, email, password)
        values (?, ?, 'password')
        returning id
        """, Long.class, username, username + "@example.com");
  }

  private BillingAccountEntity personalAccount(long userId) {
    return BillingAccountEntity.builder()
        .ownerUserId(userId)
        .type(BillingAccountType.PERSONAL)
        .status(BillingAccountStatus.ACTIVE)
        .build();
  }

  private void runBackfill() {
    jdbcTemplate.execute("""
        insert into billing_accounts (owner_user_id, type, status, created_at, updated_at)
        select users.id, 'PERSONAL', 'ACTIVE', now(), now()
        from users
        where not exists (
          select 1 from billing_accounts accounts
          where accounts.owner_user_id = users.id and accounts.type = 'PERSONAL'
        )
        """);
  }

  private int countAccounts(long userId) {
    return jdbcTemplate.queryForObject(
        "select count(*) from billing_accounts where owner_user_id = ?", Integer.class, userId);
  }
}
