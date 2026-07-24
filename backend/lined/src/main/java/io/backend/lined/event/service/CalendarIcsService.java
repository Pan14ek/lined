package io.backend.lined.event.service;

import io.backend.lined.common.exception.BadRequestException;
import io.backend.lined.common.exception.ForbiddenException;
import io.backend.lined.common.exception.GoneException;
import io.backend.lined.common.exception.NotFoundException;
import io.backend.lined.event.api.CalendarFeedTokenDto;
import io.backend.lined.event.api.CalendarImportResultDto;

/**
 * Manages secret personal ICS feeds and best-effort import of external busy-time calendars.
 *
 * <p>For example, user {@code 42} can create a secret subscription URL for Apple Calendar, while
 * importing their work calendar into lobby {@code 101} creates private events that improve
 * free-slot calculation without disclosing work details to other lobby members.</p>
 */
public interface CalendarIcsService {

  /**
   * Generates a new secret ICS feed URL and revokes every prior URL for the caller.
   *
   * <p>For example, after user {@code 42} shares a feed accidentally, generating a replacement
   * makes the former URL return {@code 410 Gone}. The raw token is returned only in this response;
   * the database stores a SHA-256 digest instead.</p>
   *
   * @param currentUserId authenticated MVP caller from {@code X-User-Id}
   * @return relative token-bearing URL for a calendar application's subscription setting
   * @throws NotFoundException if the caller no longer exists
   */
  CalendarFeedTokenDto createFeedToken(Long currentUserId);

  /**
   * Revokes all currently valid personal ICS feed URLs for the caller.
   *
   * <p>For example, calling this method twice is safe: both calls complete successfully, and any
   * previously issued URL remains retired. Historical hashes are retained solely to return
   * {@code 410 Gone} to stale subscribers.</p>
   *
   * @param currentUserId authenticated MVP caller from {@code X-User-Id}
   * @throws NotFoundException if the caller no longer exists
   */
  void revokeFeedToken(Long currentUserId);

  /**
   * Serializes the events visible to a valid secret feed token as an RFC 5545 calendar.
   *
   * <p>For example, an owner receives their private event and shared lobby events, but not a
   * fellow member's private event. This method intentionally uses token lookup as identity and
   * therefore has no {@code X-User-Id} parameter.</p>
   *
   * @param rawToken raw Base64URL credential extracted from the public feed URL
   * @return UTF-8 {@code text/calendar} document
   * @throws GoneException if the credential was revoked
   * @throws NotFoundException if the credential was never issued
   */
  String exportFeed(String rawToken);

  /**
   * Imports supported VEVENTs as private events in a lobby the caller belongs to.
   *
   * <p>For example, importing the same {@code UID:team-standup@example.com} twice updates one
   * private event for the caller and lobby rather than creating a duplicate. Timed, one-off
   * VEVENTs are supported; all-day, floating-time, and recurring entries are reported as skipped.
   * A document that cannot be parsed at all is rejected with {@code 400 Bad Request}.</p>
   *
   * @param content complete raw ICS document bytes
   * @param lobbyId destination lobby identifier
   * @param currentUserId authenticated importing user
   * @return counts and safe per-entry skipped-event explanations
   * @throws BadRequestException if the document is not parseable as iCalendar
   * @throws ForbiddenException if the caller is not a destination-lobby member
   * @throws NotFoundException if the caller or lobby does not exist
   */
  CalendarImportResultDto importCalendar(byte[] content, Long lobbyId, Long currentUserId);
}
