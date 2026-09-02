package io.backend.lined.integration.auth;

import static org.assertj.core.api.Assertions.assertThat;

import io.backend.lined.integration.AbstractApiIntegrationTest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;

class UserAuthenticationApiIT extends AbstractApiIntegrationTest {

  @Test
  void registersUserAndStoresOnlyEncodedPassword() {
    String label = uniqueLabel("register");

    var response = request(HttpMethod.POST, "/api/users", Map.of(
        "username", label,
        "email", label + "@lined.test",
        "password", "P@ssw0rd!"), null);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(response.getBody().path("email").asText()).isEqualTo(label + "@lined.test");
    assertThat(response.getBody().has("password")).isFalse();
    assertThat(jdbcTemplate.queryForObject(
        "select count(*) from users where lower(email) = lower(?)", Integer.class,
        label + "@lined.test")).isEqualTo(1);
    assertThat(jdbcTemplate.queryForObject("select password from users where username = ?", String.class,
        label)).startsWith("$2");
  }

  @Test
  void rejectsCaseInsensitiveDuplicateEmail() {
    String label = uniqueLabel("duplicate");
    registerUser(label);

    var response = request(HttpMethod.POST, "/api/users", Map.of(
        "username", label + "-other",
        "email", (label + "@LINED.TEST").toUpperCase(),
        "password", "P@ssw0rd!"), null);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    assertThat(response.getBody().path("title").asText()).isEqualTo("Conflict");
    assertThat(jdbcTemplate.queryForObject(
        "select count(*) from users where lower(email) = lower(?)", Integer.class,
        label + "@lined.test")).isEqualTo(1);
  }

  @Test
  void loginCreatesIndependentHashedRefreshSessionsAndMvpIdentityReadsCurrentUser() throws Exception {
    String label = uniqueLabel("login");
    var user = registerUser(label);

    var firstLogin = request(HttpMethod.POST, "/api/auth/login", Map.of(
        "email", label + "@lined.test",
        "password", "P@ssw0rd!"), null);
    assertTokenOnlyResponse(firstLogin);
    String rawRefreshToken = refreshToken(firstLogin.getHeaders());
    String storedHash = jdbcTemplate.queryForObject("select token_hash from auth_refresh_tokens",
        String.class);
    assertThat(storedHash).isEqualTo(sha256(rawRefreshToken)).isNotEqualTo(rawRefreshToken);
    var secondLogin = request(HttpMethod.POST, "/api/auth/login", Map.of(
        "username", label,
        "password", "P@ssw0rd!"), null);
    var currentUser = request(HttpMethod.GET, "/api/users/me", null, user.path("id").asLong());

    assertTokenOnlyResponse(secondLogin);
    assertThat(jdbcTemplate.queryForObject("select count(*) from auth_sessions where user_id = ?",
        Integer.class, user.path("id").asLong())).isEqualTo(2);
    assertThat(jdbcTemplate.queryForObject("select count(*) from auth_refresh_tokens", Integer.class))
        .isEqualTo(2);
    assertThat(currentUser.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(currentUser.getBody().path("id").asLong()).isEqualTo(user.path("id").asLong());
  }

  private void assertTokenOnlyResponse(org.springframework.http.ResponseEntity<com.fasterxml.jackson.databind.JsonNode> login) {
    assertThat(login.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(login.getBody().path("accessToken").asText()).isNotBlank();
    assertThat(login.getBody().path("tokenType").asText()).isEqualTo("Bearer");
    assertThat(login.getBody().path("expiresIn").asLong()).isEqualTo(900L);
    assertThat(login.getBody().has("refreshToken")).isFalse();
    assertThat(login.getBody().has("userId")).isFalse();
    assertThat(login.getBody().has("username")).isFalse();
    assertThat(login.getBody().has("email")).isFalse();
    assertThat(login.getBody().has("roles")).isFalse();
  }

  private String refreshToken(HttpHeaders headers) {
    String cookie = headers.getFirst(HttpHeaders.SET_COOKIE);
    assertThat(cookie).contains("lined_refresh=", "Max-Age=604800", "Path=/api/auth", "Secure",
        "HttpOnly", "SameSite=Lax");
    assertThat(cookie).doesNotContain("Domain=");
    return cookie.substring("lined_refresh=".length(), cookie.indexOf(';'));
  }

  private String sha256(String rawToken) throws Exception {
    byte[] hash = MessageDigest.getInstance("SHA-256")
        .digest(rawToken.getBytes(StandardCharsets.UTF_8));
    return java.util.HexFormat.of().formatHex(hash);
  }

  @Test
  void rejectsInvalidPasswordWithoutReturningToken() {
    String label = uniqueLabel("invalid-password");
    registerUser(label);

    var response = request(HttpMethod.POST, "/api/auth/login", Map.of(
        "username", label,
        "password", "incorrect-password"), null);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    assertThat(response.getBody().has("accessToken")).isFalse();
    assertThat(response.getBody().path("detail").asText())
        .isEqualTo("Invalid email, username, or password.");
  }

  @Test
  void rejectsCallerScopedRequestWithoutAccessToken() {
    var response = request(HttpMethod.GET, "/api/users/me", null, null);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
  }
}
