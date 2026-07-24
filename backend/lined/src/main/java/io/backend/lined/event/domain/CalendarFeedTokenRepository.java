package io.backend.lined.event.domain;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Persistence boundary for hashed personal-calendar feed credentials.
 *
 * <p>For example, a public feed request hashes the URL token before calling
 * {@link #findByTokenHash(String)}, so neither controller nor database query ever handles a raw
 * secret beyond the short lookup operation.</p>
 */
@Repository
public interface CalendarFeedTokenRepository extends JpaRepository<CalendarFeedTokenEntity, Long> {

  /**
   * Finds a feed credential regardless of whether it has been revoked.
   *
   * <p>For example, the feed service distinguishes a missing hash ({@code 404 Not Found}) from a
   * matching row whose {@code revokedAt} is set ({@code 410 Gone}).</p>
   *
   * @param tokenHash SHA-256 digest of the URL token
   * @return matching token lifecycle record, if known
   */
  Optional<CalendarFeedTokenEntity> findByTokenHash(String tokenHash);

  /**
   * Lists currently valid feed credentials for a user.
   *
   * <p>For example, token regeneration marks every returned row revoked before the service
   * persists the new credential, invalidating previously shared subscription URLs.</p>
   *
   * @param userId owner whose active feed URLs are being replaced or revoked
   * @return active, not-yet-revoked credentials
   */
  List<CalendarFeedTokenEntity> findAllByUser_IdAndRevokedAtIsNull(Long userId);
}
