package io.backend.lined.integration.security;

import static org.assertj.core.api.Assertions.assertThat;

import io.backend.lined.integration.AbstractApiIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;

class NotificationAuthorizationIT extends AbstractApiIntegrationTest {

  @Test
  void notificationReadMutationIsScopedToTheRecipient() {
    var owner = registerUser(uniqueLabel("notification-owner"));
    var recipient = registerUser(uniqueLabel("notification-recipient"));
    long ownerId = owner.path("id").asLong();
    long recipientId = recipient.path("id").asLong();
    long lobbyId = createLobby(ownerId, "Notification lobby").path("id").asLong();
    jdbcTemplate.update("insert into notifications "
        + "(recipient_id, lobby_id, type, title, message, business_key) "
        + "values (?, ?, 'TASK_ASSIGNED', 'Test', 'Test notification', ?)",
        recipientId, lobbyId, uniqueLabel("notification-key"));
    long notificationId = jdbcTemplate.queryForObject(
        "select id from notifications where recipient_id = ?", Long.class, recipientId);

    var denied = request(HttpMethod.PATCH, "/api/notifications/" + notificationId + "/read",
        null, ownerId);
    var allowed = request(HttpMethod.PATCH, "/api/notifications/" + notificationId + "/read",
        null, recipientId);

    assertThat(denied.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    assertThat(allowed.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(jdbcTemplate.queryForObject("select read_at is not null from notifications "
        + "where id = ?", Boolean.class, notificationId)).isTrue();
  }
}
