package io.backend.lined.auth.domain;

import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/** Persistence boundary for independently revocable authentication sessions. */
@Repository
public interface AuthSessionRepository extends JpaRepository<AuthSessionEntity, UUID> {

  /**
   * Revokes a session without exposing whether it had already been revoked.
   *
   * @param sessionId session to revoke
   * @param revokedAt revocation time
   * @param reason safe internal revocation category
   * @return one when this call changed the session
   */
  @Modifying(flushAutomatically = true)
  @Query("""
      update AuthSessionEntity session
      set session.revokedAt = :revokedAt,
          session.revocationReason = :reason
      where session.id = :sessionId
        and session.revokedAt is null
      """)
  int revoke(@Param("sessionId") UUID sessionId,
             @Param("revokedAt") OffsetDateTime revokedAt,
             @Param("reason") String reason);
}
