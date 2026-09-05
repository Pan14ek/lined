package io.backend.lined.user.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.jdbc.core.JdbcTemplate;

@JdbcTest(properties = {
    "spring.flyway.enabled=false",
    "spring.sql.init.mode=always",
    "spring.sql.init.schema-locations=classpath:account-deletion-schema.sql"
})
class UserDeletionPersistenceTest {

  @Autowired
  private JdbcTemplate jdbcTemplate;

  @Test
  void deleteUser_cascadesAccountDataAndClearsRetainedTaskAssignment() {
    insertFixtures();

    jdbcTemplate.update("delete from users where id = ?", 1L);

    assertThat(count("user_roles")).isZero();
    assertThat(count("lobby_members")).isEqualTo(1);
    assertThat(count("lobby_invites")).isZero();
    assertThat(count("tasks")).isEqualTo(1);
    assertThat(count("events")).isZero();
    assertThat(count("user_notification_preferences")).isZero();
    assertThat(count("lobby_notification_preferences")).isZero();
    assertThat(count("notifications")).isZero();
    assertThat(count("notification_deliveries")).isZero();
    assertThat(count("auth_sessions")).isZero();
    assertThat(count("auth_refresh_tokens")).isZero();
    assertThat(count("lobbies")).isEqualTo(1);
    assertThat(jdbcTemplate.queryForObject(
        "select assignee_id from tasks where id = 101", Long.class)).isNull();
  }

  private void insertFixtures() {
    jdbcTemplate.update("insert into users (id, username) values (1, 'deleted'), (2, 'retained')");
    jdbcTemplate.update("insert into lobbies (id, owner_id) values (10, 2)");
    jdbcTemplate.update("insert into user_roles (user_id, role_id) values (1, 1)");
    jdbcTemplate.update("insert into lobby_members (lobby_id, user_id) values (10, 1), (10, 2)");
    jdbcTemplate.update("insert into lobby_invites (id, inviter_id, invitee_id) values (1, 2, 1)");
    jdbcTemplate.update("insert into tasks (id, creator_id, assignee_id) values (100, 1, 2), (101, 2, 1)");
    jdbcTemplate.update("insert into events (id, owner_id) values (1, 1)");
    jdbcTemplate.update("insert into user_notification_preferences (id, user_id) values (1, 1)");
    jdbcTemplate.update("insert into lobby_notification_preferences (id, user_id) values (1, 1)");
    jdbcTemplate.update("insert into notifications (id, recipient_id) values (1, 1)");
    jdbcTemplate.update("insert into notification_deliveries (id, notification_id) values (1, 1)");
    jdbcTemplate.update("insert into auth_sessions (id, user_id) values (?, 1)",
        java.util.UUID.fromString("550e8400-e29b-41d4-a716-446655440000"));
    jdbcTemplate.update("insert into auth_refresh_tokens (id, session_id) values (?, ?)",
        java.util.UUID.fromString("550e8400-e29b-41d4-a716-446655440001"),
        java.util.UUID.fromString("550e8400-e29b-41d4-a716-446655440000"));
  }

  private int count(String table) {
    return jdbcTemplate.queryForList("select count(*) from " + table, Integer.class).get(0);
  }
}
