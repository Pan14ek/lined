# Task 21 — First-Run Onboarding & Empty States

**Branch:** `feature/ui-21-onboarding-empty-states`

*Depends on Tasks 3 (dashboard) and 4 (create-lobby modal). No backend work
needed.*

## Detailed description

The whole app was built and tested against a seeded account with four
lobbies. A **brand-new** user (fresh sign-up, zero lobbies) gets a dashboard
of empty sections, an empty calendar, and an empty board, with no hint that
step 1 is "create a lobby". Sign-up is the moment we lose or keep users.

1. **Dashboard first-run hero** — when `useMyLobbies()` returns `[]` (and
   there are no pending invites), replace the normal dashboard body with a
   welcome hero: greeting, one-line explanation of what a lobby is, the
   four type cards (💑 Couple / 👨‍👩‍👧 Family / 🎉 Friends / 💼 Work), and a
   "+ Create your first lobby" button. Clicking a type card opens
   `CreateLobbyModal` with that type preselected; the button opens it with
   none.
2. **Sectional empty states** — dashed-border placeholder cards (icon +
   one sentence + optional CTA) for: Upcoming Events / My Tasks on the
   dashboard (kept below the hero), the global calendar ("No events this
   week — create one"), the tasks board columns, and the lobby Calendar /
   Tasks tabs for a freshly created lobby ("Invite someone" CTA linking to
   the Members tab).
3. **Sidebar** — "No lobbies yet" muted line under MY LOBBIES (instead of
   an empty gap) when the list is empty.
4. **Pending invites win** — if the new user has pending invites, the
   existing `PendingInvitesBanner` renders *above* the hero; accepting an
   invite dismisses the hero automatically (lobbies list becomes
   non-empty).

## Idea of this task

Empty states are the product's first impression and its onboarding — a
guided "create your first lobby" moment converts a confused blank screen
into the aha moment the slogan promises.

## Reference to mockup

- New screen id **`dashboard-empty`**
  (`http://localhost:4321/#dashboard-empty`): sidebar with "No lobbies
  yet", `.empty-hero` with the four `.empty-type-card`s and primary CTA,
  and two `.empty-placeholder` cards for Upcoming Events / My Tasks.

## Development steps

1. `EmptyState` primitive (`src/components/EmptyState.tsx`): icon, text,
   optional action — used by all sectional empty states so they stay
   visually consistent.
2. `DashboardHero` (`src/components/dashboard/DashboardHero.tsx`) rendered
   from `DashboardPage` when lobbies are loaded and empty; wire type-card
   clicks to `useCreateMenuStore`'s create-lobby opener (extend it to
   accept a preselected type — `CreateLobbyModal` / `LobbyTypePicker`
   already own the type state).
3. Sweep existing pages/components and replace bare "nothing here" gaps
   with `EmptyState` (dashboard sections, `WeekGrid`/`MonthGrid` empty
   week, kanban columns, lobby tabs, sidebar).
4. Tests (MSW): empty lobbies → hero renders and type card opens the modal
   with the type preselected; non-empty lobbies → normal dashboard, no
   hero; empty lobbies + pending invite → banner above hero; kanban empty
   column shows the placeholder.

## Final / expected result

- A fresh account lands on a guided welcome instead of blank sections, and
  every list in the app has a designed empty state.
- Lint, typecheck, tests, build pass.

## REST API used

| Purpose | Endpoint |
|---|---|
| Detect first run | `GET /api/lobbies/mine` (empty array) |
| Pending invites | `GET /api/lobby-invites/mine` |
| Create lobby | `POST /api/lobbies` (via existing modal) |
