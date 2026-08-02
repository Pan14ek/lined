# Calendar

## Purpose and scope

The calendar feature manages private and shared lobby events, conflict/free-time queries, reminders, and iCalendar (ICS) interoperability. It owns calendar data and privacy rules; notification delivery is a separate supporting feature.

## Architecture and participating classes

- [`EventController`](../../../src/main/java/io/backend/lined/event/api/EventController.java) exposes event CRUD, conflict, and free-slot routes; [`CalendarIcsController`](../../../src/main/java/io/backend/lined/event/api/CalendarIcsController.java) owns feed-token, export, and import routes.
- [`EventServiceImpl`](../../../src/main/java/io/backend/lined/event/service/EventServiceImpl.java) applies visibility, lobby access, idempotency, optimistic locking, and reminder update rules.
- [`EventConflictAnalyzer`](../../../src/main/java/io/backend/lined/event/service/EventConflictAnalyzer.java), [`FreeSlotCalculator`](../../../src/main/java/io/backend/lined/event/service/FreeSlotCalculator.java), and [`EventAccessPolicy`](../../../src/main/java/io/backend/lined/event/service/EventAccessPolicy.java) isolate time-window and privacy decisions.
- [`CalendarIcsServiceImpl`](../../../src/main/java/io/backend/lined/event/service/CalendarIcsServiceImpl.java), [`CalendarFeedTokenEntity`](../../../src/main/java/io/backend/lined/event/domain/CalendarFeedTokenEntity.java), and event persistence implement import/export.

## Interactions and data flow

An event write resolves requester and lobby, validates private/shared visibility, persists the event, and asks the notification/reminder subsystem to react. Conflict and free-slot queries inspect events without revealing private details to unauthorized members. ICS feed creation issues an opaque path token; token-based export needs no identity header and includes only owner-private plus member-visible shared events. Import accepts raw or multipart RFC 5545 data and upserts caller-owned private events by UID.

## API behavior and references

The [calendar API section](../../foundation/api.md#calendar) is authoritative. The interchange format is [RFC 5545 iCalendar](https://www.rfc-editor.org/rfc/rfc5545); mutable event routes use [RFC 9110 conditional requests](https://www.rfc-editor.org/rfc/rfc9110#section-13.1).
