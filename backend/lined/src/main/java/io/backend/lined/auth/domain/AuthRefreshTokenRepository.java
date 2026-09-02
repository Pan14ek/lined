package io.backend.lined.auth.domain;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/** Persistence boundary for hashed refresh-token history. */
@Repository
public interface AuthRefreshTokenRepository extends JpaRepository<AuthRefreshTokenEntity, UUID> {

  /**
   * Finds token history by its SHA-256 representation without accepting a raw credential.
   *
   * @param tokenHash fixed-width SHA-256 hash of a presented opaque token
   * @return token history when the hash is known
   */
  Optional<AuthRefreshTokenEntity> findByTokenHash(String tokenHash);

  /**
   * Consumes a refresh token only while it is still active.
   *
   * @param tokenHash hashed presented credential
   * @param consumedAt time at which the credential was atomically consumed
   * @return one when this call won the consume race, otherwise zero
   */
  @Modifying(flushAutomatically = true)
  @Query("""
      update AuthRefreshTokenEntity token
      set token.consumedAt = :consumedAt
      where token.tokenHash = :tokenHash
        and token.consumedAt is null
        and token.revokedAt is null
      """)
  int consume(@Param("tokenHash") String tokenHash,
              @Param("consumedAt") java.time.OffsetDateTime consumedAt);

  /**
   * Revokes every still-active credential in a session family.
   *
   * @param sessionId session whose active credentials must be revoked
   * @param revokedAt time at which family revocation was detected
   * @return number of active credentials revoked
   */
  @Modifying(flushAutomatically = true)
  @Query("""
      update AuthRefreshTokenEntity token
      set token.revokedAt = :revokedAt
      where token.session.id = :sessionId
        and token.consumedAt is null
        and token.revokedAt is null
      """)
  int revokeActiveTokens(@Param("sessionId") UUID sessionId,
                         @Param("revokedAt") java.time.OffsetDateTime revokedAt);
}
