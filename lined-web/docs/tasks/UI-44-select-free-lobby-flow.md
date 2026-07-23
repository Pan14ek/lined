# Task 44 — Select-Free-Lobby Flow

**Branch:** `feature/ui-44-select-free-lobby-flow`

*Depends on Task 38 (scaffold). Backend BE-03 (`select-as-free`
endpoint), BE-12 (downgrade workflow marks lobbies READ_ONLY with
`archive_at`).*

## Detailed description

After a downgrade to Free, help the owner pick the single lobby they
want to keep writable. Explain the 30-day archive deadline plainly;
enforce the 4-member cap before the switch happens.

- **Downgrade modal** — auto-opens the first time the user visits
  `/subscription` after `effectivePlan` becomes FREE **with** any of
  their owned lobbies in `access_mode=READ_ONLY`. Shown once per
  session; a "Not now" button dismisses to a persistent banner.
- **Lobby list** — table of owned lobbies with:
  - name + type accent
  - member count (`N/4` — red if > 4)
  - current mode (READ_WRITE / READ_ONLY)
  - archive deadline (`archiveAt`) if applicable
  - radio to select as the Free lobby
- **Validation** — the "Confirm" button is disabled while the selected
  lobby has `> 4` members. Inline hint: "Remove {N-4} members before
  selecting this lobby." Provides a shortcut link to the lobby's
  Members tab.
- **Submit** — `POST /api/lobbies/{id}/select-as-free`. Success:
  toast "Free lobby set — the others will be archived on
  **{archiveDeadline}** unless you subscribe again"; invalidate
  `useMyLobbies` + `billingMe`; close modal.
- **Deadline banner** — when at least one owned lobby is READ_ONLY
  with `archiveAt` set, show a persistent banner on the dashboard:
  "Some lobbies are read-only. Choose your Free lobby by
  **{earliestArchiveAt}** or subscribe to Pro."
- **Errors** — 409 `LOBBY_MEMBER_LIMIT_EXCEEDED` (server-side, in
  case UI validation was bypassed) → inline error; 403 when caller
  isn't owner; 404 when lobby was deleted concurrently.

## Idea of this task

Downgrade doesn't destroy data — it asks the owner to choose. Turning
that choice into a single modal + one confirmed action, with the
member-count blocker clearly explained, keeps the flow calm even
though the underlying event is stressful.

## Reference to mockup

- No mockup screen exists — reuse the "Add Member" modal treatment
  from Task 6. Sketch in PR description; align copy with §29.4 (the
  design's exact wording).

## Development steps

1. **MSW first.** Extend `src/features/lobby/api/handlers.ts` with
   POST `/api/lobbies/{id}/select-as-free`:
   - success: mock lobby list flips selected to READ_WRITE, others
     stay READ_ONLY
   - 409 `LOBBY_MEMBER_LIMIT_EXCEEDED` when target has > 4 members
   - `dev.ts` + `prod.ts`: `selectAsFreeLobby(lobbyId)`
2. **Hooks.**
   - `useSelectAsFreeLobby()` mutation invalidating `myLobbies` and
     `billingMe`.
   - `useOwnedReadOnlyLobbies()` — derives from `useMyLobbies`.
3. **Components.**
   - `SelectFreeLobbyModal.tsx` — the modal itself.
   - `DowngradeDeadlineBanner.tsx` — dashboard banner.
4. **Session flag.** A Zustand slice remembers "dismissed this
   session" to avoid re-popping the modal on every route change.
5. **Integration.** Mount the modal from `BillingPage` (auto-open)
   and from the deadline banner's action; mount the banner on the
   dashboard.
6. **Tests.**
   - `SelectFreeLobbyModal.test.tsx` — auto-opens when applicable;
     confirm disabled while target has >4 members; success toasts +
     invalidates queries; 409 shows inline error.
   - `DowngradeDeadlineBanner.test.tsx` — visible only when any
     owned READ_ONLY lobby with `archiveAt` in the future; hidden
     otherwise.
   - Zustand slice: dismissal persists within session, resets on
     reload.

## Final / expected result

- Post-downgrade, the owner sees the modal on `/subscription` and a
  banner on the dashboard until they select a Free lobby.
- Selecting a lobby with >4 members is blocked with clear guidance;
  after member removal the selection unblocks.
- Success updates both `myLobbies` (mode changes) and `billingMe`.
- Lint, typecheck, tests, build pass.

## REST API used

| Purpose | Endpoint |
|---|---|
| Select Free lobby | `POST /api/lobbies/{lobbyId}/select-as-free` |
| Owned lobbies (with mode + `archiveAt`) | `GET /api/lobbies/mine` |
| Refresh billing state | `GET /api/billing/me` |

**Backend gap:** none once BE-03 + BE-12 ship. Note that `GET
/api/lobbies/mine` must include the new fields (`accessMode`,
`archiveAt`) — BE-03's DTO change delivers them.
