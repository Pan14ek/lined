# Task 45 — Read-Only Lobby UX

**Branch:** `feature/ui-45-read-only-lobby-ux`

*Depends on Task 38 (scaffold), Task 44 (deadline banner reuses the
same access-mode field). Backend BE-03 (lobby DTO includes
`accessMode` + `restrictionReason`), BE-12 (workflow flips lobbies to
READ_ONLY).*

## Detailed description

Every write control in a READ_ONLY lobby must be visually disabled
(not silently no-op) and the reduction actions from design §29.1 must
remain available. When the server rejects a write with the stable
code `LOBBY_READ_ONLY_DUE_TO_PLAN`, surface a consistent explanation.

- **Header ribbon** — at the top of any READ_ONLY lobby detail page:
  > "**Read-only** — this lobby is read-only because the owner's Pro
  > subscription ended. Nothing has been deleted."
  Includes an "Archive on **{archiveAt}**" sub-line when set. Owner
  sees an additional CTA "Select as Free lobby" (deep-links to UI-44
  modal, pre-selecting this lobby); non-owners see the same read-only
  message without the CTA.
- **Disabled controls** — Task/Event create buttons, `AddTaskDrawer`
  save, `CreateEventModal` save, `AddMemberModal`, invites, lobby
  settings General edit — all disabled with a shared tooltip helper
  `<ReadOnlyTooltip reason="…" />`. Delete/Leave/Remove-member/Select
  buttons stay enabled (design's reduction whitelist).
- **Error handling** — a shared axios/ky interceptor extension in
  `src/lib/apiClient.ts` detects `code=LOBBY_READ_ONLY_DUE_TO_PLAN`
  and dispatches a toast + query invalidation, guarding against races
  where the local state hasn't updated yet.
- **Sidebar + lobby cards** — a small "🔒 Read-only" badge next to
  the lobby name in the sidebar and on dashboard lobby cards.

## Idea of this task

A user shouldn't have to press "Save" to discover an action isn't
allowed. Reading `accessMode` in every write component and disabling
the control up-front avoids the whole class of "why can't I click
this?" tickets. Wiring the stable error code centrally ensures the
same message when a race sneaks past.

## Reference to mockup

- No mockup exists — reuse the existing lobby detail layout with
  disabled-button treatments from Task 22 (touch-target audit). Copy
  matches design §29.4 verbatim.

## Development steps

1. **Types + hook.** `LobbyDto` already includes `accessMode` +
   `restrictionReason` + `archiveAt` from BE-03; verify types match
   in `src/features/lobby/model/`.
2. **Shared primitive.** `src/features/lobby/read-only/ReadOnlyTooltip.tsx`
   — wraps a disabled control with a `Tooltip` explaining the reason;
   reused by every write action.
3. **Header ribbon.** `src/features/lobby/read-only/ReadOnlyRibbon.tsx`
   — inserted at the top of `LobbyPage`, above the tab bar.
4. **Write-path sweep.** For each of these files, gate the interactive
   control behind `lobby.accessMode === 'READ_WRITE'`:
   - `src/features/lobby/header/LobbyHeader.tsx` (edit button)
   - `src/features/lobby/tasks/AddTaskDrawer.tsx` (save button)
   - `src/features/calendar/CreateEventModal.tsx` (only when lobby
     is pre-locked to a READ_ONLY lobby)
   - `src/features/lobby/members/AddMemberModal.tsx` (invite send)
   - `src/features/lobby/settings/LobbyGeneralCard.tsx` (save)
   - `src/features/lobby/settings/LobbyNotificationsCard.tsx` (allow
     save — notifications aren't a lobby write per se; verify with
     product)
   Keep enabled: Members-tab "Remove", "Make owner"; DangerZone
   "Leave" and "Delete"; `SelectFreeLobbyModal` action.
5. **API client extension.** In `src/lib/apiClient.ts`, add an
   `afterResponse` hook that detects `code=LOBBY_READ_ONLY_DUE_TO_PLAN`
   in 409 bodies and calls a shared `notify.error` + emits a custom
   event so the affected query invalidates.
6. **Sidebar + card badges.** Small badge in `Sidebar.tsx` and
   `LobbyCardGrid.tsx`.
7. **Tests.**
   - `ReadOnlyRibbon.test.tsx` — copy, owner vs. member CTA visibility.
   - Sweep tests: each write component with a READ_ONLY lobby prop —
     button is disabled; reduction-write buttons stay enabled.
   - `apiClient.readonly.test.ts` — 409 with the code triggers the
     shared toast + invalidation.

## Final / expected result

- Every write in a READ_ONLY lobby is visibly disabled with a
  consistent tooltip; reduction actions still work.
- A race that gets a write past the UI gets a consistent toast + a
  fresh lobby query.
- Sidebar + dashboard show the "read-only" badge.
- Lint, typecheck, tests, build pass.

## REST API used

| Purpose | Endpoint |
|---|---|
| Lobby detail (includes access fields) | `GET /api/lobbies/{id}` |
| Any write path | existing endpoints; interceptor handles `LOBBY_READ_ONLY_DUE_TO_PLAN` |

**Backend gap:** none once BE-03 + BE-12 ship. If BE-03's DTO change
lands after this task starts, feature-flag the badges on
`accessMode !== undefined`.
