package io.backend.lined.integration.security;

import static org.assertj.core.api.Assertions.assertThat;

import io.backend.lined.integration.AbstractApiIntegrationTest;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;

class UserObjectAuthorizationIT extends AbstractApiIntegrationTest {

  @Test
  void foreignAccountMutationIsRejectedBeforeVersionAndDeleteCannotCrossAccounts() {
    var alice = registerUser(uniqueLabel("bola-alice"));
    var bob = registerUser(uniqueLabel("bola-bob"));
    long aliceId = alice.path("id").asLong();
    long bobId = bob.path("id").asLong();
    String originalEmail = bob.path("email").asText();

    var patch = request(HttpMethod.PATCH, "/api/users/" + bobId,
        Map.of("email", "stolen-change@lined.test"), aliceId, "\"999\"");
    var delete = request(HttpMethod.DELETE, "/api/users/" + bobId, null, aliceId, "\"999\"");

    assertThat(patch.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    assertThat(delete.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    assertThat(jdbcTemplate.queryForObject("select email from users where id = ?", String.class,
        bobId)).isEqualTo(originalEmail);
    assertThat(jdbcTemplate.queryForObject("select count(*) from users where id = ?", Integer.class,
        bobId)).isEqualTo(1);
  }

  @Test
  void foreignAccountReadsExposeOnlyPublicIdentityAndRoleDirectoryIsAdminOnly() {
    var alice = registerUser(uniqueLabel("public-alice"));
    var bob = registerUser(uniqueLabel("public-bob"));
    long aliceId = alice.path("id").asLong();
    long bobId = bob.path("id").asLong();

    var profile = request(HttpMethod.GET, "/api/users/" + bobId, null, aliceId);
    var search = request(HttpMethod.GET, "/api/users/search?q=" + bob.path("username").asText(),
        null, aliceId);
    var byRole = request(HttpMethod.GET, "/api/users/by-role?role=ROLE_USER", null, aliceId);

    assertThat(profile.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(profile.getBody().fieldNames()).toIterable()
        .containsExactlyInAnyOrder("id", "username");
    assertThat(search.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(search.getBody().path("content").get(0).fieldNames()).toIterable()
        .containsExactlyInAnyOrder("id", "username");
    assertThat(byRole.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
  }
}
