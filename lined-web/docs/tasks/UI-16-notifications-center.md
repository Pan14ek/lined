# Task 16 — Notifications Center

**Branch:** `feature/ui-16-notifications-center`

*Depends on Task 15 (API contract refresh). Touches Tasks 12/13's
notification sections — see "Supersedes" below.*

## Detailed description

1. **Notification bell** — the 🔔 button in the dashboard/page top bars
   becomes functional: unread-count badge, click opens an inbox dropdown
   (or panel) listing notifications from `GET /api/notifications/mine` —
   type icon, message, relative time; unread rows highlighted; clicking a
   row marks it read (`PATCH /api/notifications/{id}/read`) and navigates to
   the related lobby/event/task where identifiable.
2. **Backend-persisted preferences** — the notification toggles in User
   Settings (global) and Lobby Settings (per-lobby) move from the
   client-only Zustand store to the real endpoints
   (`GET/PATCH /api/notifications/preferences`,
   `GET/PATCH /api/lobbies/{lobbyId}/notification-preferences`). Partial
   PATCH: send only the toggled field.

## Idea of this task

The backend now has a full preference-gated notification pipeline with an
inbox; surfacing it closes the loop for "Notify members/assignee" toggles on
the create flows and makes the settings toggles real.

## Supersedes

- `UI-12-user-settings.md` step 4 (client-only notifications store) — use
  the API instead.
- `UI-13-lobby-settings.md` step 3 (client-only per-lobby toggles) — use the
  API instead.
If those tasks are already implemented with the local store, this task
replaces that storage; if not yet started, implement them API-backed
directly and skip the migration.

## Reference to mockup

- The bell button appears on screen id **`dashboard`**; the toggle sections
  are on **`user-settings`** and **`lobby-settings`** (`mockups/index.html`,
  serve with `npx serve -p 4321 mockups/`).
- **There is no inbox-dropdown mockup screen.** Build it in the create-menu
  dropdown's visual language (`.create-dropdown` styles); recommended: add a
  `notifications` screen to the mockup for parity.

## Development steps

1. Hooks in `src/hooks/useNotifications.ts`: `useMyNotifications()` (poll
   with `refetchInterval` ~60s while the app is focused),
   `useMarkNotificationRead()`, `useNotificationPreferences()`,
   `useUpdateNotificationPreferences()`, per-lobby equivalents. Query keys
   in `QUERY_KEYS`.
2. Build `NotificationBell` + `NotificationInbox` components (shadcn
   `dropdown-menu` or `sheet`); unread badge = count of `readAt == null`
   records capped at "9+".
3. Wire the bell into the dashboard top bar (and any other top bar showing
   it).
4. Rewire User Settings and Lobby Settings notification cards to the
   preference hooks with optimistic toggle + rollback on error.
5. Tests (MSW): unread badge count; clicking marks read and updates cache;
   preference PATCH sends only changed fields; per-lobby prefs load per
   lobby.

## Final / expected result

- The bell shows a live unread count; the inbox lists, marks read, and
  navigates.
- Global and per-lobby notification toggles persist to the backend and
  survive reload/re-login on another device.
- Lint, typecheck, tests, build pass.

## REST API used

| Purpose | Endpoint |
|---|---|
| Inbox | `GET /api/notifications/mine` → notification records with delivery info |
| Mark read | `PATCH /api/notifications/{id}/read` |
| Global prefs | `GET/PATCH /api/notifications/preferences` |
| Per-lobby prefs | `GET/PATCH /api/lobbies/{lobbyId}/notification-preferences` |

**Backend gap:** email/push deliveries exist only as pending intents — no
external delivery yet; reminders are not generated yet (proposal
`backend/lined/docs/api-proposals/event-reminder-scheduler.md`). The inbox
is in-app only for now.
