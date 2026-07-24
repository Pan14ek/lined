package io.backend.lined.auth.domain;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Persistence boundary for hashed, single-use password-reset credentials.
 *
 * <p>Callers always provide an HMAC hash, never the raw token delivered to a user. For example,
 * a redemption converts {@code raw-token} to its hash and calls
 * {@link #claimUnusedUnexpired(String, OffsetDateTime, OffsetDateTime)} so PostgreSQL decides
 * whether that row can still be consumed.</p>
 */
@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetTokenEntity, Long> {

  /**
   * Finds an unused token by its persisted hash.
   *
   * <p>For example, maintenance code can inspect an unused hash without accepting an expired
   * token as valid. Redemption should prefer {@link #claimUnusedUnexpired(String, OffsetDateTime,
   * OffsetDateTime)} because a read followed by a write would allow concurrent consumers.</p>
   *
   * @param tokenHash HMAC hash of the raw reset token
   * @return the unused token, or an empty result when it is unknown or already consumed
   */
  Optional<PasswordResetTokenEntity> findByTokenHashAndUsedAtIsNull(String tokenHash);

  /**
   * Finds a token by its unique hash regardless of whether it is already marked used.
   *
   * <p>For example, after a successful atomic claim, the service reloads the row through this
   * method to obtain the target user. It must not use this method alone to authorize redemption,
   * because it intentionally includes consumed and expired rows.</p>
   *
   * @param tokenHash HMAC hash of the raw reset token
   * @return the matching token, or an empty result when no row has that hash
   */
  Optional<PasswordResetTokenEntity> findByTokenHash(String tokenHash);

  /**
   * Lists all currently unused tokens belonging to one user.
   *
   * <p>For example, when token {@code A} is redeemed, the service uses this result to mark other
   * outstanding tokens such as {@code B} as used, preventing either from resetting the password
   * later.</p>
   *
   * @param userId identifier of the token owner
   * @return unused reset-token rows for that user
   */
  List<PasswordResetTokenEntity> findAllByUser_IdAndUsedAtIsNull(Long userId);

  /**
   * Atomically consumes a token only when it is unused and has not expired.
   *
   * <p>For example, two requests may submit the same raw token at the same time. Both derive the
   * same {@code tokenHash}, but PostgreSQL updates one row for exactly one request and returns
   * {@code 1}; the competing request observes {@code 0} after the winner commits. Callers must
   * treat every result other than {@code 1} as the generic invalid-token case.</p>
   *
   * @param tokenHash HMAC hash of the submitted raw token
   * @param now current UTC instant used to reject expired tokens
   * @param usedAt UTC instant recorded as the single-use claim time
   * @return {@code 1} when this invocation claimed the token; {@code 0} otherwise
   */
  @Modifying(flushAutomatically = true, clearAutomatically = true)
  @Query("""
      update PasswordResetTokenEntity token
         set token.usedAt = :usedAt
       where token.tokenHash = :tokenHash
         and token.usedAt is null
         and token.expiresAt > :now
      """)
  int claimUnusedUnexpired(
      @Param("tokenHash") String tokenHash,
      @Param("now") OffsetDateTime now,
      @Param("usedAt") OffsetDateTime usedAt);
}
