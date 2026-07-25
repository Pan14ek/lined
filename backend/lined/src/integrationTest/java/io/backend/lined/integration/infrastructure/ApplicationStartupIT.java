package io.backend.lined.integration.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import io.backend.lined.integration.AbstractApiIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class ApplicationStartupIT extends AbstractApiIntegrationTest {

  @Test
  void applicationAndPostgreSqlStartSuccessfully() {
    var response = restTemplate.getForEntity("/actuator/health", String.class);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(jdbcTemplate.queryForObject("select 1", Integer.class)).isEqualTo(1);
  }
}
