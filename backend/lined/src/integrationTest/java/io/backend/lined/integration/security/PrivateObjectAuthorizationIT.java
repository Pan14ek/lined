package io.backend.lined.integration.security;

import static org.assertj.core.api.Assertions.assertThat;

import io.backend.lined.integration.AbstractApiIntegrationTest;
import java.time.OffsetDateTime;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;

class PrivateObjectAuthorizationIT extends AbstractApiIntegrationTest {

  private static final OffsetDateTime START = OffsetDateTime.parse("2026-08-11T18:00:00Z");
  private static final OffsetDateTime END = OffsetDateTime.parse("2026-08-11T19:00:00Z");

  @Test
  void privateTaskAndEventIdsAreHiddenFromAcceptedLobbyMembers() {
    var owner = registerUser(uniqueLabel("private-owner"));
    var member = registerUser(uniqueLabel("private-member"));
    long ownerId = owner.path("id").asLong();
    long memberId = member.path("id").asLong();
    long lobbyId = createLobby(ownerId, "Private objects").path("id").asLong();
    long inviteId = invite(ownerId, lobbyId, memberId).path("id").asLong();
    assertThat(request(HttpMethod.POST, "/api/lobby-invites/" + inviteId + "/accept",
        null, memberId).getStatusCode()).isEqualTo(HttpStatus.OK);

    var task = request(HttpMethod.POST, "/api/tasks", Map.of(
        "title", "Private task", "lobbyId", lobbyId, "visibility", "PRIVATE"), ownerId);
    var event = request(HttpMethod.POST, "/api/calendar/events", Map.of(
        "title", "Private event", "shared", false, "startAt", START.toString(),
        "endAt", END.toString(), "timezone", "UTC", "lobbyId", lobbyId,
        "notifyMembers", false), ownerId);
    var taskRead = request(HttpMethod.GET, "/api/tasks?lobbyId="
        + task.getBody().path("lobbyId").asLong(), null, memberId);
    var eventRead = request(HttpMethod.GET,
        "/api/calendar/events/" + event.getBody().path("id").asLong(), null, memberId);

    assertThat(task.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(event.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(taskRead.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(taskRead.getBody()).isEmpty();
    assertThat(eventRead.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
  }

  @Test
  void taskAssigneeMustBelongToTheTargetLobbyAndUnauthorizedLobbyIdIsNotClaimed() {
    var owner = registerUser(uniqueLabel("task-owner"));
    var outsider = registerUser(uniqueLabel("task-outsider"));
    long ownerId = owner.path("id").asLong();
    long outsiderId = outsider.path("id").asLong();
    long lobbyId = createLobby(ownerId, "Task authorization").path("id").asLong();

    var foreignAssignee = request(HttpMethod.POST, "/api/tasks",
        Map.of("title", "Foreign assignee", "lobbyId", lobbyId, "assigneeId", outsiderId), ownerId);
    String idempotencyKey = uniqueLabel("foreign-lobby-key");
    var foreignLobby = requestWithIdempotency(idempotencyKey, ownerId, lobbyId, outsiderId);

    assertThat(foreignAssignee.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    assertThat(foreignLobby.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    assertThat(jdbcTemplate.queryForObject("select count(*) from tasks", Integer.class)).isZero();
    assertThat(jdbcTemplate.queryForObject(
        "select count(*) from idempotency_requests where idempotency_key = ?", Integer.class,
        idempotencyKey)).isZero();
  }

  private org.springframework.http.ResponseEntity<com.fasterxml.jackson.databind.JsonNode>
      requestWithIdempotency(String key, long requesterId, long lobbyId, long assigneeId) {
    org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
    headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
    headers.setBearerAuth(token(requesterId));
    headers.set("Idempotency-Key", key);
    return restTemplate.exchange("/api/tasks", HttpMethod.POST,
        new org.springframework.http.HttpEntity<>(Map.of(
            "title", "Foreign lobby", "lobbyId", lobbyId + 1000, "assigneeId", assigneeId), headers),
        com.fasterxml.jackson.databind.JsonNode.class);
  }

  private String token(long userId) {
    org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
    authenticate(headers, userId);
    return headers.getFirst(org.springframework.http.HttpHeaders.AUTHORIZATION).substring(7);
  }
}
