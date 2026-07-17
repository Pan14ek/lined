# Task 28 — Lobby Chat Tab

**Branch:** `feature/ui-28-lobby-chat`

*Depends on Task 5 (lobby tab bar). Mock-first against the proposed lobby
chat API. Prefer landing after Task 24 (i18n) so all strings are born
localized.*

## Detailed description

Coordination conversations ("can we move dinner to 8?") happen outside
Lined today. The backend proposal defines a minimal member-only message
log; this task gives it a UI as a fourth lobby tab.

1. **Chat tab** — `💬 Chat` added to `LobbyTabBar` (between Tasks and
   Members, `?tab=chat`): scrollable message list (day dividers, avatar +
   bubble + author/time meta; own messages right-aligned in the green
   tint) above a sticky composer (input + Send, Enter submits,
   Shift+Enter newline, 2000-char limit with a near-limit counter).
2. **Delivery = polling** — per the proposal: `GET .../messages` newest-
   first with keyset pagination; while the tab is visible poll every ~5s
   with `after={lastSeenId}` and append; "Load earlier" at the top uses
   `before={oldestId}`. Auto-scroll to bottom on new messages only when
   the user is already at the bottom.
3. **Own-message actions** — hover menu on own bubbles: Edit (inline,
   PATCH, "(edited)" marker from `editedAt`) and Delete (owner can delete
   any; shared `ConfirmDialog`).
4. **Optimistic send** — message appears immediately (pending style),
   reconciled on response; failure marks it "Failed — tap to retry".
5. **Notifications** — `CHAT_MESSAGE` notifications deep-link to the chat
   tab; the per-lobby notifications card gains the `chatMessagesEnabled`
   toggle.

## Idea of this task

Chat keeps the see-plan → discuss → adjust loop inside the product, next
to the calendar it's about — the strongest retention surface of Phase 2,
deliberately minimal (no threads/reactions/attachments in v1).

## Reference to mockup

- New screen id **`lobby-chat`** (`http://localhost:4321/#lobby-chat`):
  the couple lobby with the 💬 Chat tab active — day divider, Anastasiia's
  bubbles left, Alex's green-tinted bubble right with "You · 5:44 PM"
  meta, sticky composer with Send.

## Development steps

1. MSW first: seeded conversation + handlers for list (keyset both
   directions), post, patch, delete, permission errors.
2. `src/api/chat.ts` + `useLobbyChat.ts` hooks: `useLobbyMessages`
   (infinite query, `refetchInterval` while mounted), `useSendMessage`
   (optimistic append), `useEditMessage`, `useDeleteMessage`.
3. Components under `src/components/lobby/chat/`: `ChatTab`,
   `MessageBubble`, `MessageComposer`, `DayDivider`; wire the tab into
   `LobbyPage`/`LobbyTabBar`; extend `LobbyNotificationsCard` with the new
   toggle and `NotificationInbox` routing for `CHAT_MESSAGE`.
4. Tests (MSW): list renders grouped by day with own-message styling;
   send appends optimistically and reconciles; failed send shows retry;
   edit shows "(edited)"; member-only 403 renders the error state;
   pagination loads earlier messages; polling appends new ones (fake
   timers).

## Final / expected result

- Lobby members chat inside the lobby with edit/delete, optimistic send,
  polling updates, and notification integration — all against MSW until
  the backend ships.
- Lint, typecheck, tests, build pass.

## REST API used

| Purpose | Endpoint |
|---|---|
| List (paginated) | `GET /api/lobbies/{id}/messages?before=&after=&limit=` |
| Send | `POST /api/lobbies/{id}/messages` |
| Edit | `PATCH /api/lobbies/{id}/messages/{messageId}` |
| Delete | `DELETE /api/lobbies/{id}/messages/{messageId}` |

**Backend gap:** `feature/lobby-chat-api` —
`backend/lined/docs/api-proposals/lobby-chat-api.md`.
