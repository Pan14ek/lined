package io.backend.lined.event.api;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Gives an authenticated user the secret URL of their personal calendar subscription feed.
 *
 * <p>For example, a successful {@code POST /api/calendar/feed-token} returns
 * {@code /api/calendar/feed/AbCd...xyz.ics}. The path itself is a bearer credential: clients
 * must store it privately and request a replacement when it has been exposed.</p>
 *
 * @param feedUrl relative, token-bearing ICS feed URL
 */
@Schema(name = "CalendarFeedTokenDto")
public record CalendarFeedTokenDto(
    @Schema(example = "/api/calendar/feed/AbCdEf123.ics") String feedUrl
) {
}
