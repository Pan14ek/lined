package io.backend.lined.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import com.nimbusds.jose.proc.SecurityContext;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;

class JwtTokenServiceTest {

  private static final Instant NOW = Instant.parse("2026-08-31T10:15:30Z");
  private static final String SECRET = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=";

  @Test
  void issueFor_issuesApprovedFifteenMinuteJwtClaims() {
    JwtProperties properties = properties();
    JwtTokenService service = new JwtTokenService(encoder(properties), properties,
        Clock.fixed(NOW, ZoneOffset.UTC));

    String token = service.issueFor(42L);
    Jwt jwt = decoder(properties).decode(token);

    assertThat(token.split("\\.")).hasSize(3);
    assertThat(jwt.getHeaders()).containsEntry("alg", MacAlgorithm.HS256.getName());
    assertThat(jwt.getSubject()).isEqualTo("42");
    assertThat(jwt.getClaimAsString("iss")).isEqualTo("lined");
    assertThat(jwt.getAudience()).containsExactly("lined-api");
    assertThat(jwt.getIssuedAt()).isEqualTo(NOW);
    assertThat(jwt.getExpiresAt()).isEqualTo(NOW.plus(Duration.ofMinutes(15)));
    assertThat(jwt.getId()).matches("[0-9a-f-]{36}");
    assertThat(jwt.getClaims().keySet())
        .containsExactlyInAnyOrder("sub", "iss", "aud", "iat", "exp", "jti");
    assertThat(service.tokenType()).isEqualTo("Bearer");
    assertThat(service.ttlSeconds()).isEqualTo(900L);
  }

  @Test
  void issueFor_assignsUniqueTokenIdentifier() {
    JwtProperties properties = properties();
    JwtTokenService service = new JwtTokenService(encoder(properties), properties,
        Clock.fixed(NOW, ZoneOffset.UTC));

    Jwt first = decoder(properties).decode(service.issueFor(42L));
    Jwt second = decoder(properties).decode(service.issueFor(42L));

    assertThat(first.getId()).isNotEqualTo(second.getId());
  }

  @Test
  void issueFor_rejectsNonPositiveUserId() {
    JwtProperties properties = properties();
    JwtTokenService service = new JwtTokenService(encoder(properties), properties,
        Clock.fixed(NOW, ZoneOffset.UTC));

    assertThatThrownBy(() -> service.issueFor(0L))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("JWT subject must be a positive user id");
  }

  private JwtProperties properties() {
    return new JwtProperties("lined", "lined-api", Duration.ofMinutes(15), Duration.ofMinutes(1),
        SECRET);
  }

  private JwtEncoder encoder(JwtProperties properties) {
    return new NimbusJwtEncoder(new ImmutableSecret<SecurityContext>(properties.signingKey()));
  }

  private JwtDecoder decoder(JwtProperties properties) {
    NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(properties.signingKey())
        .macAlgorithm(MacAlgorithm.HS256)
        .build();
    JwtTimestampValidator validator = new JwtTimestampValidator();
    validator.setClock(Clock.fixed(NOW, ZoneOffset.UTC));
    decoder.setJwtValidator(validator);
    return decoder;
  }

}
