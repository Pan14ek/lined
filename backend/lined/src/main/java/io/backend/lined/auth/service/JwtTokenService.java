package io.backend.lined.auth.service;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

/**
 * Issues the short-lived JWT access tokens consumed by Lined's resource server.
 *
 * <p>Each token represents only a stable user identity. Roles, permissions, profile information,
 * memberships, and subscription state remain authoritative in the database instead of becoming
 * stale authorization data in a token.</p>
 */
@Service
@RequiredArgsConstructor
public class JwtTokenService {

  private static final String TOKEN_TYPE = "Bearer";

  private final JwtEncoder jwtEncoder;
  private final JwtProperties properties;
  private final Clock clock;

  /**
   * Issues one HS256 access token for a persisted Lined user.
   *
   * @param userId immutable Lined user identifier
   * @return signed compact JWT with only the approved access-token claims
   */
  public String issueFor(long userId) {
    if (userId <= 0) {
      throw new IllegalArgumentException("JWT subject must be a positive user id");
    }

    Instant issuedAt = clock.instant();
    JwtClaimsSet claims = JwtClaimsSet.builder()
        .subject(Long.toString(userId))
        .issuer(properties.issuer())
        .audience(java.util.List.of(properties.audience()))
        .issuedAt(issuedAt)
        .expiresAt(issuedAt.plus(properties.accessTokenTtl()))
        .id(UUID.randomUUID().toString())
        .build();
    JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).type("JWT").build();
    return jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
  }

  /**
   * Returns the HTTP authentication scheme expected for issued access tokens.
   *
   * @return standard Bearer token type
   */
  public String tokenType() {
    return TOKEN_TYPE;
  }

  /**
   * Returns the externally configured access-token lifetime in seconds.
   *
   * @return token lifetime for the login response
   */
  public long ttlSeconds() {
    return properties.accessTokenTtl().toSeconds();
  }

}
