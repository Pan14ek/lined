package io.backend.lined.billing.domain.plan;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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
class BillingCatalogSchemaIT {

  @Container
  private static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16-alpine");

  @Autowired
  private JdbcTemplate jdbcTemplate;

  @Autowired
  private PlanCatalogRepository planCatalogRepository;

  @Autowired
  private PriceCatalogRepository priceCatalogRepository;

  @DynamicPropertySource
  static void postgresProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
    registry.add("spring.datasource.username", POSTGRES::getUsername);
    registry.add("spring.datasource.password", POSTGRES::getPassword);
  }

  @AfterEach
  void tearDown() {
    jdbcTemplate.execute("truncate table billing_prices, billing_plans cascade");
    jdbcTemplate.execute("""
        insert into billing_plans (code, display_name, active)
        values ('FREE', 'Free', true), ('PRO', 'Pro', true)
        """);
    jdbcTemplate.execute("""
        insert into billing_prices (code, plan_code, billing_interval, provider, provider_price_id, active)
        values ('PRO_MONTHLY', 'PRO', 'MONTH', 'sandbox', 'sandbox-pro-monthly', true),
               ('PRO_YEARLY', 'PRO', 'YEAR', 'sandbox', 'sandbox-pro-yearly', true)
        """);
  }

  @Test
  void schema_seedsCatalogAndRemovesLegacyTables() {
    assertThat(count("billing_plans")).isEqualTo(2);
    assertThat(count("billing_prices")).isEqualTo(2);
    assertThat(planCatalogRepository.findById(PlanCode.PRO)).isPresent();
    assertThat(priceCatalogRepository.findById(PriceCode.PRO_MONTHLY))
        .map(PriceCatalogEntity::getProviderPriceId)
        .contains("sandbox-pro-monthly");
    assertThat(jdbcTemplate.queryForObject(
        "select provider_price_id from billing_prices where code = 'PRO_MONTHLY'", String.class))
        .isEqualTo("sandbox-pro-monthly");
    assertThat(tableExists("plans")).isFalse();
    assertThat(tableExists("user_subscriptions")).isFalse();
  }

  @Test
  void schema_enforcesUniqueCatalogCodes() {
    assertThatThrownBy(() -> jdbcTemplate.update("""
        insert into billing_plans (code, display_name, active)
        values ('PRO', 'Another Pro', true)
        """))
        .isInstanceOf(DataIntegrityViolationException.class);
    assertThatThrownBy(() -> jdbcTemplate.update("""
        insert into billing_prices (code, plan_code, billing_interval, provider, provider_price_id, active)
        values ('PRO_MONTHLY', 'PRO', 'MONTH', 'sandbox', 'duplicate', true)
        """))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  private int count(String table) {
    return jdbcTemplate.queryForObject("select count(*) from " + table, Integer.class);
  }

  private boolean tableExists(String table) {
    return Boolean.TRUE.equals(jdbcTemplate.queryForObject(
        "select to_regclass(?) is not null", Boolean.class, table));
  }
}
