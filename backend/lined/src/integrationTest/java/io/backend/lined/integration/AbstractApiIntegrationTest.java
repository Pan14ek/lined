package io.backend.lined.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.backend.lined.integration.support.DatabaseCleaner;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.util.UriComponentsBuilder;

@ApiIntegrationTest
public abstract class AbstractApiIntegrationTest {

  @Autowired
  protected TestRestTemplate restTemplate;
  @Autowired
  protected JdbcTemplate jdbcTemplate;
  @Autowired
  protected ObjectMapper objectMapper;
  @Autowired
  private DatabaseCleaner databaseCleaner;

  @BeforeEach
  void cleanDatabaseBeforeTest() {
    databaseCleaner.clean();
  }

  protected JsonNode registerUser(String label) {
    return request(HttpMethod.POST, "/api/users", Map.of(
        "username", label,
        "email", label + "@lined.test",
        "password", "P@ssw0rd!"), null).getBody();
  }

  protected String uniqueLabel(String prefix) {
    return prefix + "-" + UUID.randomUUID().toString().substring(0, 8);
  }

  protected JsonNode createLobby(long ownerId, String name) {
    return request(HttpMethod.POST, "/api/lobbies", Map.of(
        "name", name,
        "lobbyType", "FAMILY"), ownerId).getBody();
  }

  protected JsonNode invite(long ownerId, long lobbyId, long inviteeId) {
    return request(HttpMethod.POST,
        "/api/lobbies/" + lobbyId + "/invites?userId=" + inviteeId, null, ownerId).getBody();
  }

  protected JsonNode createSharedEvent(long ownerId, long lobbyId, OffsetDateTime start,
                                       OffsetDateTime end) {
    return request(HttpMethod.POST, "/api/calendar/events", Map.of(
        "title", "Dinner together",
        "location", "Kitchen",
        "shared", true,
        "startAt", start.toString(),
        "endAt", end.toString(),
        "timezone", "Europe/Kyiv",
        "lobbyId", lobbyId,
        "notifyMembers", false), ownerId).getBody();
  }

  protected ResponseEntity<JsonNode> request(HttpMethod method, String path, Object body,
                                              Long userId) {
    return request(method, path, body, userId, null);
  }

  protected ResponseEntity<JsonNode> request(HttpMethod method, String path, Object body,
                                              Long userId, String ifMatch) {
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    if (userId != null) {
      headers.set("X-User-Id", String.valueOf(userId));
    }
    if (ifMatch != null) {
      headers.setIfMatch(ifMatch);
    }
    return restTemplate.exchange(path, method, new HttpEntity<>(body, headers), JsonNode.class);
  }

  protected ResponseEntity<JsonNode> listEvents(long userId, long lobbyId, OffsetDateTime from,
                                                  OffsetDateTime to) {
    String path = UriComponentsBuilder.fromPath("/api/calendar/events")
        .queryParam("lobbyId", lobbyId)
        .queryParam("from", from)
        .queryParam("to", to)
        .build()
        .encode()
        .toUriString();
    return request(HttpMethod.GET, path, null, userId);
  }
}
