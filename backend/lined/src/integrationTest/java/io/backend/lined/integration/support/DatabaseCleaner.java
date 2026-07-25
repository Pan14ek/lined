package io.backend.lined.integration.support;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DatabaseCleaner {

  private final JdbcTemplate jdbcTemplate;

  public DatabaseCleaner(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  /** Clears mutable user-owned data while retaining reference rows seeded by schema.sql. */
  public void clean() {
    jdbcTemplate.execute("TRUNCATE TABLE users RESTART IDENTITY CASCADE");
  }
}
