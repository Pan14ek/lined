# API Proposal — Calendar ICS Export & Import

**Branch:** `feature/calendar-ics-integration`
**Status:** Implemented
**Motivation:** README Phase 1 ("Integration with Google Calendar /
Outlook"). Full OAuth-based two-way sync is a large project; the standard
iCalendar (RFC 5545) format gives 80% of the value with no third-party API
dependency: Google Calendar, Outlook, and Apple Calendar can all subscribe
to an ICS feed URL and import/export ICS files.

## What the API should do

### 1. Personal ICS feed (export)

```
POST /api/calendar/feed-token            → 201 { "feedUrl": "/api/calendar/feed/{token}.ics" }
DELETE /api/calendar/feed-token          → 204 (revoke)
GET  /api/calendar/feed/{token}.ics      → 200 text/calendar (no auth header — token IS the auth)
```

- The feed contains the caller's events (own + shared in their lobbies) as
  VEVENTs: title, location, start/end (UTC with TZID), description carrying
  the lobby name.
- The token is a long random secret bound to one user; regenerating/revoking
  invalidates old URLs. Standard "secret address" model used by Google
  Calendar itself.

### 2. ICS import

```
POST /api/calendar/import?lobbyId={id}   (multipart or text/calendar body)
→ 200 { "imported": 14, "skipped": 2, "errors": [] }
```

- Parses VEVENTs and creates **private** events for the caller in the given
  lobby (private, so imported work calendars block the user's free slots
  without exposing details to other members — exactly what free-slot
  accuracy needs).
- Dedupe by ICS `UID` (persist it on the event) so re-importing updates
  instead of duplicating.

**Errors:** `400` unparsable ICS, `403` non-member lobby, `410` revoked feed
token.

## Why it matters

- Free-slot detection is only as good as the calendars it sees; import pulls
  real-world busy time into Lined, and the feed keeps external calendars
  showing Lined plans.
- Stepping stone: when Google OAuth sync arrives later, the UID-dedupe and
  event-mapping groundwork is already in place.

## Implementation notes

- Use a maintained iCal library (e.g. `ical4j`) — do not hand-roll RFC 5545.
- Feed endpoint must be excluded from the `X-User-Id` requirement; the token
  lookup is the identity.
- Store `icsUid` (nullable, indexed) on the event entity.
- Tests: feed round-trip (export → parse), import dedupe, timezone handling
  (`OffsetDateTime` UTC + original `timezone` field), token revocation.

## Definition of done

An external calendar app can subscribe to a user's feed URL and see their
Lined events; importing an ICS file creates/updates private events and
tightens free-slot results; documented in `docs/api.md`; quality gates pass.
