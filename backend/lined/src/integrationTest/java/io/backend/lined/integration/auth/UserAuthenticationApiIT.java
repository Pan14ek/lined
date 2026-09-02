package io.backend.lined.integration.auth;

import static org.assertj.core.api.Assertions.assertThat;

import io.backend.lined.integration.AbstractApiIntegrationTest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
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
  void loginCreatesIndependentHashedRefreshSessionsAndBearerIdentityReadsCurrentUser()
      throws Exception {
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

  @Test
  void currentUserEndpointIgnoresSpoofedIdentityHeader() {
    String aliceLabel = uniqueLabel("alice");
    String bobLabel = uniqueLabel("bob");
    var alice = registerUser(aliceLabel);
    var bob = registerUser(bobLabel);
    HttpHeaders headers = new HttpHeaders();
    authenticate(headers, alice.path("id").asLong());
    headers.set("X-User-Id", String.valueOf(bob.path("id").asLong()));

    var response = restTemplate.exchange("/api/users/me", HttpMethod.GET,
        new org.springframework.http.HttpEntity<>(null, headers),
        com.fasterxml.jackson.databind.JsonNode.class);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(response.getBody().path("id").asLong()).isEqualTo(alice.path("id").asLong());
    assertThat(response.getBody().path("username").asText()).isEqualTo(aliceLabel);
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
    String cookie = Objects.requireNonNull(headers.getFirst(HttpHeaders.SET_COOKIE));
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

  @Test
  void refreshRotatesCredentialAndRejectsTheConsumedCredential() {
    String label = uniqueLabel("refresh");
    var user = registerUser(label);
    var login = request(HttpMethod.POST, "/api/auth/login", Map.of(
        "username", label,
        "password", "P@ssw0rd!"), null);
    String firstToken = refreshToken(login.getHeaders());
    CsrfCredentials csrf = csrfCredentials();

    var refresh = refresh(firstToken, csrf);
    String successor = refreshTokenValue(refresh.getHeaders());

    assertThat(refresh.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertTokenOnlyResponse(refresh);
    assertThat(successor).isNotEqualTo(firstToken);
    assertThat(jdbcTemplate.queryForObject(
        "select count(*) from auth_refresh_tokens where consumed_at is not null", Integer.class))
        .isEqualTo(1);

    var replay = refresh(firstToken, csrf);
    assertThat(replay.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    assertThat(replay.getBody().path("code").asText()).isEqualTo("auth.session.invalid");
    assertThat(jdbcTemplate.queryForObject(
        "select count(*) from auth_sessions where user_id = ? and revoked_at is not null",
        Integer.class, user.path("id").asLong())).isEqualTo(1);
    assertThat(refresh(successor, csrf).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
  }

  @Test
  void logoutRevokesOnlyCurrentSessionAndIsIdempotent() throws Exception {
    String label = uniqueLabel("logout");
    var user = registerUser(label);
    var firstLogin = request(HttpMethod.POST, "/api/auth/login", Map.of(
        "username", label,
        "password", "P@ssw0rd!"), null);
    String firstToken = refreshToken(firstLogin.getHeaders());
    var secondLogin = request(HttpMethod.POST, "/api/auth/login", Map.of(
        "username", label,
        "password", "P@ssw0rd!"), null);
    String secondToken = refreshToken(secondLogin.getHeaders());
    UUID firstSessionId = sessionIdFor(firstToken);
    UUID secondSessionId = sessionIdFor(secondToken);
    CsrfCredentials csrf = csrfCredentials();

    var logout = logout(firstToken, csrf);

    assertThat(logout.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
    assertThat(logout.getHeaders().getFirst(HttpHeaders.SET_COOKIE))
        .contains("lined_refresh=", "Max-Age=0", "Path=/api/auth", "Secure", "HttpOnly",
            "SameSite=Lax");
    assertThat(jdbcTemplate.queryForObject(
        "select revocation_reason from auth_sessions where id = ?", String.class,
        firstSessionId)).isEqualTo("logout");
    assertThat(jdbcTemplate.queryForObject(
        "select revoked_at from auth_sessions where id = ?", Object.class, secondSessionId))
        .isNull();
    assertThat(refresh(firstToken, csrf).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    assertThat(refresh(secondToken, csrf).getStatusCode()).isEqualTo(HttpStatus.OK);

    assertThat(logout(firstToken, csrf).getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
    assertThat(jdbcTemplate.queryForObject(
        "select count(*) from auth_sessions where user_id = ? and revoked_at is not null",
        Integer.class, user.path("id").asLong())).isEqualTo(1);
  }

  @Test
  void refreshRejectsServerExpiredIdleAndAbsoluteSessions() {
    String label = uniqueLabel("expiry");
    var user = registerUser(label);
    var login = request(HttpMethod.POST, "/api/auth/login", Map.of(
        "username", label,
        "password", "P@ssw0rd!"), null);
    String refreshToken = refreshToken(login.getHeaders());
    CsrfCredentials csrf = csrfCredentials();
    UUID sessionId = jdbcTemplate.queryForObject(
        "select id from auth_sessions where user_id = ?", UUID.class, user.path("id").asLong());

    jdbcTemplate.update("update auth_sessions set idle_expires_at = now() - interval '1 second' "
        + "where id = ?", sessionId);
    assertThat(refresh(refreshToken, csrf).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);

    var secondLogin = request(HttpMethod.POST, "/api/auth/login", Map.of(
        "username", label,
        "password", "P@ssw0rd!"), null);
    String secondToken = refreshToken(secondLogin.getHeaders());
    UUID secondSessionId = jdbcTemplate.queryForObject(
        "select id from auth_sessions where user_id = ? and id <> ?",
        UUID.class, user.path("id").asLong(), sessionId);
    jdbcTemplate.update("update auth_sessions set absolute_expires_at = now() - interval '1 second' "
        + "where id = ?", secondSessionId);

    assertThat(refresh(secondToken, csrf).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
  }

  @Test
  void concurrentRefreshesProduceOneSuccessAndRevokeTheFamilyOnReplay() throws Exception {
    String label = uniqueLabel("concurrent-refresh");
    var user = registerUser(label);
    var login = request(HttpMethod.POST, "/api/auth/login", Map.of(
        "username", label,
        "password", "P@ssw0rd!"), null);
    String refreshToken = refreshToken(login.getHeaders());
    CsrfCredentials csrf = csrfCredentials();
    ExecutorService executor = Executors.newFixedThreadPool(2);
    CountDownLatch start = new CountDownLatch(1);

    try {
      Future<org.springframework.http.ResponseEntity<com.fasterxml.jackson.databind.JsonNode>> first =
          submitRefresh(executor, start, refreshToken, csrf);
      Future<org.springframework.http.ResponseEntity<com.fasterxml.jackson.databind.JsonNode>> second =
          submitRefresh(executor, start, refreshToken, csrf);
      start.countDown();

      List<org.springframework.http.HttpStatusCode> statuses = List.of(
          first.get().getStatusCode(), second.get().getStatusCode());
      assertThat(statuses).containsExactlyInAnyOrder(HttpStatus.OK, HttpStatus.UNAUTHORIZED);
      assertThat(jdbcTemplate.queryForObject(
          "select count(*) from auth_sessions where user_id = ? and revoked_at is not null",
          Integer.class, user.path("id").asLong())).isEqualTo(1);
      assertThat(jdbcTemplate.queryForObject(
          "select count(*) from auth_refresh_tokens where session_id = "
              + "(select id from auth_sessions where user_id = ?)", Integer.class,
          user.path("id").asLong())).isEqualTo(2);
    } finally {
      executor.shutdownNow();
    }
  }

  private Future<org.springframework.http.ResponseEntity<com.fasterxml.jackson.databind.JsonNode>>
      submitRefresh(ExecutorService executor, CountDownLatch start, String refreshToken,
                    CsrfCredentials csrf) {
    return executor.submit(() -> {
      start.await();
      return refresh(refreshToken, csrf);
    });
  }

  private CsrfCredentials csrfCredentials() {
    var response = request(HttpMethod.GET, "/api/auth/csrf", null, null);
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    var body = Objects.requireNonNull(response.getBody());
    String token = body.path("token").asText();
    String cookie = Objects.requireNonNull(response.getHeaders().getFirst(HttpHeaders.SET_COOKIE));
    assertThat(token).isNotBlank();
    assertThat(cookie).startsWith("XSRF-TOKEN=");
    return new CsrfCredentials(token, cookie.substring(0, cookie.indexOf(';')));
  }

  private org.springframework.http.ResponseEntity<com.fasterxml.jackson.databind.JsonNode> refresh(
      String refreshToken, CsrfCredentials csrf) {
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
    headers.add(HttpHeaders.COOKIE, "lined_refresh=" + refreshToken + "; " + csrf.cookie());
    headers.set("X-XSRF-TOKEN", csrf.token());
    return restTemplate.exchange("/api/auth/refresh", HttpMethod.POST,
        new org.springframework.http.HttpEntity<>(null, headers),
        com.fasterxml.jackson.databind.JsonNode.class);
  }

  private org.springframework.http.ResponseEntity<com.fasterxml.jackson.databind.JsonNode> logout(
      String refreshToken, CsrfCredentials csrf) {
    HttpHeaders headers = new HttpHeaders();
    headers.add(HttpHeaders.COOKIE, "lined_refresh=" + refreshToken + "; " + csrf.cookie());
    headers.set("X-XSRF-TOKEN", csrf.token());
    return restTemplate.exchange("/api/auth/logout", HttpMethod.POST,
        new org.springframework.http.HttpEntity<>(null, headers),
        com.fasterxml.jackson.databind.JsonNode.class);
  }

  private UUID sessionIdFor(String refreshToken) throws Exception {
    return jdbcTemplate.queryForObject(
        "select session_id from auth_refresh_tokens where token_hash = ?", UUID.class,
        sha256(refreshToken));
  }

  private String refreshTokenValue(HttpHeaders headers) {
    String cookie = Objects.requireNonNull(headers.getFirst(HttpHeaders.SET_COOKIE));
    assertThat(cookie).startsWith("lined_refresh=");
    return cookie.substring("lined_refresh=".length(), cookie.indexOf(';'));
  }

  private record CsrfCredentials(String token, String cookie) {
  }
}
