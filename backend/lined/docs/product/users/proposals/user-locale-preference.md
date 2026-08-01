# API Proposal — User Locale Preference

**Branch:** `feature/user-locale-preference`
**Status:** Proposed
**Motivation:** The web app is adding localization (UI task
[UI task 24](../../../../../../lined-web/docs/tasks/UI-24-i18n-localization.md), first languages English
and Ukrainian). A language choice stored only in `localStorage` resets on
every new device/browser, and the backend cannot localize
server-originated text (notification messages, future reminder emails)
without knowing the user's language.

## What the API should do

One nullable field on the existing user surface — no new endpoints:

```
UserDto / UserUpdateDto: + "locale": "en" | "uk" | null

PATCH /api/users/{id}   Body: { "locale": "uk" }   → 200 UserDto
```

- BCP 47 language tags, validated against the supported set (`en`, `uk`
  for now); `null` = "not chosen" → client falls back to
  `navigator.language`, backend falls back to `Accept-Language`, then `en`.
- Notification **message templating** becomes locale-aware where messages
  are generated server-side: either (a) store a message key + params on the
  notification record and let clients render localized text (preferred —
  zero server template work, works retroactively when translations
  improve), or (b) render with the recipient's locale at creation time.
  v1 recommendation: **(a)** — add optional `messageKey` + `messageParams`
  alongside the existing `message` string, keeping `message` as the English
  fallback so old clients don't break.

## Why it matters

- Ukrainian-speaking couples/families are an explicit early market; a
  language switch that silently resets per device reads as broken.
- The `messageKey` groundwork is what lets the notification inbox, and
  later email/push delivery, speak the user's language without a backend
  template system.

## Implementation notes

- Column `locale VARCHAR(10) NULL` on `users`; validation annotation with
  the supported-set check; include in `UserDto`, accept in `UserUpdateDto`
  (PATCH-only-changed-fields semantics already exist).
- `messageKey`/`messageParams` (JSON string) columns on the notification
  record are additive and nullable — emit them for new notifications,
  leave old rows untouched.
- Tests: PATCH round-trip, rejection of unsupported tags, notification
  records carry key+params for a newly emitted type.

## Definition of done

A user's language choice persists via `PATCH /api/users/{id}`, comes back
in `UserDto`, new notifications carry a renderable message key with the
English string still present, and `docs/foundation/api.md` documents the field;
quality gates pass.
