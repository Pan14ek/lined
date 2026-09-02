package io.backend.lined.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.backend.lined.common.exception.UnauthorizedException;
import java.time.Instant;
import java.util.stream.Stream;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

class SpringSecurityCurrentUserProviderTest {

  private final SpringSecurityCurrentUserProvider provider = new SpringSecurityCurrentUserProvider();

  @AfterEach
  void clearSecurityContext() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void requireUserId_returnsJwtSubject() {
    Instant issuedAt = Instant.parse("2026-09-02T10:00:00Z");
    Jwt jwt = Jwt.withTokenValue("access-token")
        .header("alg", "HS256")
        .subject("42")
        .issuedAt(issuedAt)
        .expiresAt(issuedAt.plusSeconds(900))
        .build();
    SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(
        jwt, AuthorityUtils.createAuthorityList()));

    assertThat(provider.requireUserId()).isEqualTo(42L);
  }

  @Test
  void requireUserId_rejectsMissingAuthentication() {
    assertThatThrownBy(provider::requireUserId)
        .isInstanceOf(UnauthorizedException.class)
        .hasMessage("Authenticated user identity is missing or invalid");
  }

  @Test
  void requireUserId_rejectsAnonymousAuthentication() {
    SecurityContextHolder.getContext().setAuthentication(new AnonymousAuthenticationToken(
        "test-key", "anonymousUser", AuthorityUtils.createAuthorityList("ROLE_ANONYMOUS")));

    assertThatThrownBy(provider::requireUserId)
        .isInstanceOf(UnauthorizedException.class);
  }

  @ParameterizedTest
  @MethodSource("invalidSubjects")
  void requireUserId_rejectsInvalidSubject(String subject) {
    SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(
        jwt(subject), AuthorityUtils.createAuthorityList()));

    assertThatThrownBy(provider::requireUserId)
        .isInstanceOf(UnauthorizedException.class);
  }

  private static Stream<Arguments> invalidSubjects() {
    return Stream.of("", "not-a-number", "0", "-1", "9223372036854775808")
        .map(Arguments::of);
  }

  private Jwt jwt(String subject) {
    Instant issuedAt = Instant.parse("2026-09-02T10:00:00Z");
    return Jwt.withTokenValue("access-token")
        .header("alg", "HS256")
        .subject(subject)
        .issuedAt(issuedAt)
        .expiresAt(issuedAt.plusSeconds(900))
        .build();
  }
}
