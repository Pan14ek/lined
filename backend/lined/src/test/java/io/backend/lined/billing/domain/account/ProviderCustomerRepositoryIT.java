package io.backend.lined.billing.domain.account;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@Testcontainers(disabledWithoutDocker = true)
class ProviderCustomerRepositoryIT {

  @Container
  private static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16-alpine");

  @Autowired
  private BillingAccountRepository billingAccountRepository;

  @Autowired
  private JdbcTemplate jdbcTemplate;

  @Autowired
  private ProviderCustomerRepository providerCustomerRepository;

  @DynamicPropertySource
  static void postgresProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
    registry.add("spring.datasource.username", POSTGRES::getUsername);
    registry.add("spring.datasource.password", POSTGRES::getPassword);
  }

  @AfterEach
  void tearDown() {
    jdbcTemplate.execute("truncate table billing_provider_customers, billing_accounts, users cascade");
  }

  @Test
  void schema_enforcesProviderCustomerAndAccountProviderUniqueness() {
    long firstAccountId = accountId("first-customer");
    long secondAccountId = accountId("second-customer");
    providerCustomerRepository.saveAndFlush(customer(firstAccountId, "sandbox", "cus_shared"));

    assertThat(providerCustomerRepository.findByBillingAccountIdAndProvider(
        firstAccountId, "sandbox"))
        .map(ProviderCustomerEntity::getProviderCustomerId)
        .contains("cus_shared");

    assertThatThrownBy(() -> providerCustomerRepository.saveAndFlush(
        customer(firstAccountId, "sandbox", "cus_second")))
        .isInstanceOf(DataIntegrityViolationException.class);
    assertThatThrownBy(() -> providerCustomerRepository.saveAndFlush(
        customer(secondAccountId, "stripe", "cus_shared")))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  private long accountId(String username) {
    Long userId = jdbcTemplate.queryForObject("""
        insert into users (username, email, password)
        values (?, ?, 'password')
        returning id
        """, Long.class, username, username + "@example.com");
    return jdbcTemplate.queryForObject("""
        insert into billing_accounts (owner_user_id, type, status)
        values (?, 'PERSONAL', 'ACTIVE')
        returning id
        """, Long.class, userId);
  }

  private ProviderCustomerEntity customer(long billingAccountId, String provider,
                                          String providerCustomerId) {
    return ProviderCustomerEntity.builder()
        .billingAccount(billingAccountRepository.getReferenceById(billingAccountId))
        .provider(provider)
        .providerCustomerId(providerCustomerId)
        .build();
  }
}
