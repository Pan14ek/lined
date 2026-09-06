package io.backend.lined.integration.event;

import static org.assertj.core.api.Assertions.assertThat;

import io.backend.lined.integration.AbstractApiIntegrationTest;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;

class EventApiIT extends AbstractApiIntegrationTest {

  private static final OffsetDateTime EVENT_START = OffsetDateTime.parse("2026-08-10T18:00:00+03:00");
  private static final OffsetDateTime EVENT_END = OffsetDateTime.parse("2026-08-10T20:00:00+03:00");

  @Test
  void createsSharedEventVisibleToBothLobbyMembers() {
    var owner = registerUser(uniqueLabel("event-owner"));
    var member = registerUser(uniqueLabel("event-member"));
    long ownerId = owner.path("id").asLong();
    long memberId = member.path("id").asLong();
    var lobby = createLobby(ownerId, "Event Lobby");
    var invite = invite(ownerId, lobby.path("id").asLong(), memberId);
    request(HttpMethod.POST, "/api/lobby-invites/" + invite.path("id").asLong() + "/accept",
        null, memberId);

    var event = createSharedEvent(ownerId, lobby.path("id").asLong(), EVENT_START, EVENT_END);
    var memberRead = request(HttpMethod.GET,
        "/api/calendar/events/" + event.path("id").asLong(), null, memberId);
    var memberList = listEvents(memberId, lobby.path("id").asLong(),
        EVENT_START.minusHours(1).withOffsetSameInstant(ZoneOffset.UTC),
        EVENT_END.plusHours(1).withOffsetSameInstant(ZoneOffset.UTC));

    assertThat(memberRead.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(memberRead.getBody().path("title").asText()).isEqualTo("Dinner together");
    assertThat(memberList.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(memberList.getBody()).hasSize(1);
    assertThat(memberList.getBody().get(0).path("id").asLong()).isEqualTo(event.path("id").asLong());
  }

  @Test
  void createsEventForAcceptedLobbyMemberWithoutIdempotencyKey() {
    var owner = registerUser(uniqueLabel("event-owner"));
    var member = registerUser(uniqueLabel("event-member"));
    long ownerId = owner.path("id").asLong();
    long memberId = member.path("id").asLong();
    var lobby = createLobby(ownerId, "Member Event Lobby");
    var invite = invite(ownerId, lobby.path("id").asLong(), memberId);
    request(HttpMethod.POST, "/api/lobby-invites/" + invite.path("id").asLong() + "/accept",
        null, memberId);

    var response = request(HttpMethod.POST, "/api/calendar/events", Map.of(
        "title", "Member event",
        "shared", true,
        "startAt", EVENT_START.toString(),
        "endAt", EVENT_END.toString(),
        "timezone", "Europe/Kyiv",
        "lobbyId", lobby.path("id").asLong(),
        "notifyMembers", false), memberId);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(response.getBody().path("ownerId").asLong()).isEqualTo(memberId);
  }

  @Test
  void rejectsEventCreationByNonMemberWithoutPersistingEvent() {
    var owner = registerUser(uniqueLabel("event-owner"));
    var outsider = registerUser(uniqueLabel("event-outsider"));
    var lobby = createLobby(owner.path("id").asLong(), "Protected Event Lobby");

    var response = request(HttpMethod.POST, "/api/calendar/events", Map.of(
        "title", "Unauthorized event",
        "shared", true,
        "startAt", EVENT_START.toString(),
        "endAt", EVENT_END.toString(),
        "timezone", "Europe/Kyiv",
        "lobbyId", lobby.path("id").asLong(),
        "notifyMembers", false), outsider.path("id").asLong());

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    assertThat(jdbcTemplate.queryForObject("select count(*) from events", Integer.class)).isZero();
  }

  @Test
  void rejectsEventWhoseEndDoesNotFollowStart() {
    var owner = registerUser(uniqueLabel("invalid-event-owner"));
    var lobby = createLobby(owner.path("id").asLong(), "Validation Lobby");

    var response = request(HttpMethod.POST, "/api/calendar/events", Map.of(
        "title", "Invalid interval",
        "shared", true,
        "startAt", EVENT_END.toString(),
        "endAt", EVENT_START.toString(),
        "timezone", "Europe/Kyiv",
        "lobbyId", lobby.path("id").asLong(),
        "notifyMembers", false), owner.path("id").asLong());

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    assertThat(response.getBody().path("detail").asText()).contains("end");
    assertThat(jdbcTemplate.queryForObject("select count(*) from events", Integer.class)).isZero();
  }

  @Test
  void preservesEventInstantAcrossOffsetSerialization() {
    var owner = registerUser(uniqueLabel("timezone-owner"));
    long ownerId = owner.path("id").asLong();
    var lobby = createLobby(ownerId, "Timezone Lobby");
    var created = createSharedEvent(ownerId, lobby.path("id").asLong(), EVENT_START, EVENT_END);

    var response = request(HttpMethod.GET,
        "/api/calendar/events/" + created.path("id").asLong(), null, ownerId);
    OffsetDateTime returnedStart = OffsetDateTime.parse(response.getBody().path("startAt").asText());
    OffsetDateTime returnedEnd = OffsetDateTime.parse(response.getBody().path("endAt").asText());

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(returnedStart.toInstant()).isEqualTo(EVENT_START.toInstant());
    assertThat(returnedEnd.toInstant()).isEqualTo(EVENT_END.toInstant());
  }
}
