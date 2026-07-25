package io.backend.lined.integration.lobby;

import static org.assertj.core.api.Assertions.assertThat;

import io.backend.lined.integration.AbstractApiIntegrationTest;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;

class LobbyApiIT extends AbstractApiIntegrationTest {

  @Test
  void createsLobbyWithOwnerAsItsOnlyInitialMember() {
    var owner = registerUser(uniqueLabel("lobby-owner"));
    long ownerId = owner.path("id").asLong();

    var lobby = createLobby(ownerId, "Our Family");
    var mine = request(HttpMethod.GET, "/api/lobbies/mine", null, ownerId);

    assertThat(lobby.path("ownerId").asLong()).isEqualTo(ownerId);
    assertThat(lobby.path("memberIds")).hasSize(1);
    assertThat(lobby.path("memberIds").get(0).asLong()).isEqualTo(ownerId);
    assertThat(mine.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(mine.getBody()).hasSize(1);
    assertThat(mine.getBody().get(0).path("id").asLong()).isEqualTo(lobby.path("id").asLong());
  }

  @Test
  void invitesAndAddsSecondUserToLobby() {
    var owner = registerUser(uniqueLabel("invite-owner"));
    var invitee = registerUser(uniqueLabel("invitee"));
    long ownerId = owner.path("id").asLong();
    long inviteeId = invitee.path("id").asLong();
    var lobby = createLobby(ownerId, "Invite Lobby");

    var invite = invite(ownerId, lobby.path("id").asLong(), inviteeId);
    var accepted = request(HttpMethod.POST,
        "/api/lobby-invites/" + invite.path("id").asLong() + "/accept", null, inviteeId);
    var visibleLobby = request(HttpMethod.GET,
        "/api/lobbies/" + lobby.path("id").asLong(), null, inviteeId);

    assertThat(accepted.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(accepted.getBody().path("status").asText()).isEqualTo("ACCEPTED");
    assertThat(visibleLobby.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(visibleLobby.getBody().path("memberIds")).hasSize(2);
    assertThat(jdbcTemplate.queryForObject("select count(*) from lobby_members where lobby_id = ?",
        Integer.class, lobby.path("id").asLong())).isEqualTo(2);
  }

  @Test
  void rejectsLobbyDetailsForNonMemberWithoutReturningLobbyData() {
    var owner = registerUser(uniqueLabel("hidden-owner"));
    var outsider = registerUser(uniqueLabel("hidden-outsider"));
    var lobby = createLobby(owner.path("id").asLong(), "Hidden Lobby");

    var response = request(HttpMethod.GET, "/api/lobbies/" + lobby.path("id").asLong(), null,
        outsider.path("id").asLong());

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    assertThat(response.getBody().has("name")).isFalse();
    assertThat(response.getBody().path("code").asText()).isEqualTo("common.forbidden");
  }

  @Test
  void rejectsOwnerOnlyLobbyUpdateByMember() {
    var owner = registerUser(uniqueLabel("update-owner"));
    var member = registerUser(uniqueLabel("update-member"));
    long ownerId = owner.path("id").asLong();
    long memberId = member.path("id").asLong();
    var lobby = createLobby(ownerId, "Original Lobby");
    var invite = invite(ownerId, lobby.path("id").asLong(), memberId);
    request(HttpMethod.POST, "/api/lobby-invites/" + invite.path("id").asLong() + "/accept",
        null, memberId);

    var response = request(HttpMethod.PATCH, "/api/lobbies/" + lobby.path("id").asLong(),
        Map.of("name", "Changed by member"), memberId, "\"0\"");
    var ownerRead = request(HttpMethod.GET, "/api/lobbies/" + lobby.path("id").asLong(), null,
        ownerId);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    assertThat(ownerRead.getBody().path("name").asText()).isEqualTo("Original Lobby");
  }
}
