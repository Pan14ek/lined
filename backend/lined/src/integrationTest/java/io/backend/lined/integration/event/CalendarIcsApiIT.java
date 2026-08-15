package io.backend.lined.integration.event;

import static org.assertj.core.api.Assertions.assertThat;

import io.backend.lined.integration.AbstractApiIntegrationTest;
import io.micrometer.core.instrument.MeterRegistry;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Objects;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;

class CalendarIcsApiIT extends AbstractApiIntegrationTest {

  private static final OffsetDateTime EVENT_START = OffsetDateTime.parse("2026-08-10T18:00:00Z");
  private static final OffsetDateTime EVENT_END = OffsetDateTime.parse("2026-08-10T20:00:00Z");

  @Autowired
  private MeterRegistry meterRegistry;

  @Test
  void importCalendar_persistsPrivateVisibility() {
    var owner = registerUser(uniqueLabel("ics-owner"));
    long ownerId = owner.path("id").asLong();
    var lobby = createLobby(ownerId, "ICS import lobby");
    String document = """
        BEGIN:VCALENDAR
        VERSION:2.0
        BEGIN:VEVENT
        UID:private-import@example.com
        DTSTART:20260810T180000Z
        DTEND:20260810T200000Z
        SUMMARY:Private external appointment
        END:VEVENT
        END:VCALENDAR
        """;
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.parseMediaType("text/calendar"));
    headers.set("X-User-Id", String.valueOf(ownerId));
    double createdBefore = counterCount("lined.private.item.created", "item.type", "event");

    var response = restTemplate.exchange("/api/calendar/import?lobbyId=" + lobby.path("id").asLong(),
        HttpMethod.POST, new HttpEntity<>(document.getBytes(StandardCharsets.UTF_8), headers),
        com.fasterxml.jackson.databind.JsonNode.class);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(response.getBody().path("imported").asInt()).isEqualTo(1);
    assertThat(jdbcTemplate.queryForObject("select visibility from events", String.class))
        .isEqualTo("PRIVATE");
    assertThat(jdbcTemplate.queryForObject("select shared from events", Boolean.class)).isFalse();
    assertThat(counterCount("lined.private.item.created", "item.type", "event"))
        .isEqualTo(createdBefore + 1.0);
  }

  @Test
  void exportFeed_excludesAnotherMembersPrivateEvent() {
    var owner = registerUser(uniqueLabel("feed-owner"));
    var member = registerUser(uniqueLabel("feed-member"));
    long ownerId = owner.path("id").asLong();
    long memberId = member.path("id").asLong();
    var lobby = createLobby(ownerId, "ICS feed lobby");
    long lobbyId = lobby.path("id").asLong();
    var invite = invite(ownerId, lobbyId, memberId);
    request(HttpMethod.POST, "/api/lobby-invites/" + invite.path("id").asLong() + "/accept",
        null, memberId);
    createEvent(ownerId, lobbyId, "Owner private", false);
    persistEvent(memberId, lobbyId, "Member private", false, "PRIVATE");
    persistEvent(memberId, lobbyId, "Member shared", true, "SHARED");

    var tokenResponse = request(HttpMethod.POST, "/api/calendar/feed-token", null, ownerId);
    String feedUrl = Objects.requireNonNull(tokenResponse.getBody()).path("feedUrl").asText();
    var feed = restTemplate.getForEntity(feedUrl,
        String.class);

    assertThat(feed.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(feed.getBody()).contains("Owner private", "Member shared");
    assertThat(feed.getBody()).doesNotContain("Member private");
  }

  private void createEvent(long ownerId, long lobbyId, String title, boolean shared) {
    var response = request(HttpMethod.POST, "/api/calendar/events", Map.of(
        "title", title,
        "shared", shared,
        "startAt", EVENT_START.toString(),
        "endAt", EVENT_END.toString(),
        "timezone", "UTC",
        "lobbyId", lobbyId,
        "notifyMembers", false), ownerId);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
  }

  private void persistEvent(long ownerId, long lobbyId, String title, boolean shared,
                            String visibility) {
    jdbcTemplate.update("""
        insert into events (title, shared, visibility, start_at, end_at, timezone, lobby_id,
                            owner_id, created_at, version)
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        """, title, shared, visibility, EVENT_START, EVENT_END, "UTC", lobbyId, ownerId,
        EVENT_START.minusDays(1));
  }

  private double counterCount(String metric, String... tags) {
    var counter = meterRegistry.find(metric).tags(tags).counter();
    return counter == null ? 0.0 : counter.count();
  }
}
