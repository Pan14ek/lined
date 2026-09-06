package io.backend.lined.integration.security;

import static org.assertj.core.api.Assertions.assertThat;

import io.backend.lined.integration.AbstractApiIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;

class LobbyInviteObjectAuthorizationIT extends AbstractApiIntegrationTest {

  @Test
  void inviteParentAndChildIdsMustMatch() {
    var ownerA = registerUser(uniqueLabel("invite-owner-a"));
    var ownerB = registerUser(uniqueLabel("invite-owner-b"));
    var invitee = registerUser(uniqueLabel("invite-target"));
    long ownerAId = ownerA.path("id").asLong();
    long ownerBId = ownerB.path("id").asLong();
    long inviteeId = invitee.path("id").asLong();
    long lobbyAId = createLobby(ownerAId, "Invite A").path("id").asLong();
    long lobbyBId = createLobby(ownerBId, "Invite B").path("id").asLong();
    long inviteBId = invite(ownerBId, lobbyBId, inviteeId).path("id").asLong();

    var foreignParent = request(HttpMethod.DELETE,
        "/api/lobbies/" + lobbyAId + "/invites/" + inviteBId, null, ownerAId);
    var outsiderCreate = request(HttpMethod.POST,
        "/api/lobbies/" + lobbyAId + "/invites?userId=" + inviteeId, null, ownerBId);

    assertThat(foreignParent.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    assertThat(outsiderCreate.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    assertThat(jdbcTemplate.queryForObject("select status from lobby_invites where id = ?",
        String.class, inviteBId)).isEqualTo("PENDING");
  }

  @Test
  void wrongInviteeCannotAcceptOrDeclineAnotherUsersInvite() {
    var owner = registerUser(uniqueLabel("invite-owner"));
    var invited = registerUser(uniqueLabel("invited"));
    var wrongUser = registerUser(uniqueLabel("wrong-invitee"));
    long ownerId = owner.path("id").asLong();
    long invitedId = invited.path("id").asLong();
    long wrongUserId = wrongUser.path("id").asLong();
    long lobbyId = createLobby(ownerId, "Invite privacy").path("id").asLong();
    long inviteId = invite(ownerId, lobbyId, invitedId).path("id").asLong();

    var accept = request(HttpMethod.POST, "/api/lobby-invites/" + inviteId + "/accept",
        null, wrongUserId);
    var decline = request(HttpMethod.POST, "/api/lobby-invites/" + inviteId + "/decline",
        null, wrongUserId);

    assertThat(accept.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    assertThat(decline.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    assertThat(jdbcTemplate.queryForObject("select status from lobby_invites where id = ?",
        String.class, inviteId)).isEqualTo("PENDING");
  }
}
