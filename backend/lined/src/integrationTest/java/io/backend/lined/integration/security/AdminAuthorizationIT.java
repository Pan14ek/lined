package io.backend.lined.integration.security;

import static org.assertj.core.api.Assertions.assertThat;

import io.backend.lined.integration.AbstractApiIntegrationTest;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;

class AdminAuthorizationIT extends AbstractApiIntegrationTest {

  @Test
  void onlyDatabaseBackedAdministratorCanManageRoles() {
    var ordinary = registerUser(uniqueLabel("role-ordinary"));
    var target = registerUser(uniqueLabel("role-target"));
    long ordinaryId = ordinary.path("id").asLong();
    long targetId = target.path("id").asLong();

    var denied = request(HttpMethod.PUT, "/api/roles/user/" + targetId,
        Map.of("roles", java.util.List.of("ROLE_ADMIN")), ordinaryId);

    assertThat(denied.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    assertThat(jdbcTemplate.queryForObject("select count(*) from user_roles ur join roles r "
        + "on r.id = ur.role_id where ur.user_id = ? and r.name = 'ROLE_ADMIN'", Integer.class,
        targetId)).isZero();

    long adminRoleId = jdbcTemplate.queryForObject(
        "select id from roles where name = 'ROLE_ADMIN'", Long.class);
    jdbcTemplate.update("insert into user_roles (user_id, role_id) values (?, ?)",
        ordinaryId, adminRoleId);

    var allowed = request(HttpMethod.PUT, "/api/roles/user/" + targetId,
        Map.of("roles", java.util.List.of("ROLE_ADMIN")), ordinaryId);

    assertThat(allowed.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(allowed.getBody().toString()).contains("ROLE_ADMIN");
  }

  @Test
  void ordinaryUserCannotCreateRole() {
    var ordinary = registerUser(uniqueLabel("role-create-ordinary"));

    var response = request(HttpMethod.POST, "/api/roles/ROLE_AUDITOR", null,
        ordinary.path("id").asLong());

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    assertThat(jdbcTemplate.queryForObject(
        "select count(*) from roles where name = 'ROLE_AUDITOR'", Integer.class)).isZero();
  }
}
