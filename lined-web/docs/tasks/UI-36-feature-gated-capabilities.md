# Task 36 — Feature-Gated Product Capabilities

**Branch:** `feature/ui-36-feature-gated-capabilities`

**Dependencies:** [UI-35](UI-35-feature-flags-foundation.md) and backend
[FF-BE-02](../../../backend/lined/docs/tasks/FF-BE-02-feature-enforcement.md).

## Detailed description

Apply the seven public flags consistently across Lined's routes, desktop and
mobile navigation, embedded feature surfaces, global create overlays, and data
queries. Use the capability boundaries in the canonical
[Feature Flags design](../../../backend/lined/docs/feature-flags.md), not a
simple folder/path rule.

Disabled UI must not issue protected network requests. Shared reads may remain
active only where an enabled capability needs them.

## Capability integration matrix

| Flag | UI surfaces to gate |
|---|---|
| Dashboard | Normal Dashboard sections/widgets at `/` |
| Lobbies | Sidebar lobby management, create lobby, lobby pages/members/invites |
| Calendar | Calendar nav/route, lobby Calendar tab, event/reserve actions, calendar/free-slot Dashboard content |
| Tasks | Tasks nav/route, lobby Tasks tab, task create/edit, task Dashboard content |
| Notifications | Bell/inbox, pending-notification content, global/lobby preference controls |
| Settings | Settings nav/route and user account/profile actions |
| Subscriptions | Subscription settings link/route and plan/subscription actions |

Invite ownership remains with Lobbies even when an invite is rendered inside
the notification dropdown. Lobby shared reads may support Calendar/Tasks while
Lobby management is disabled.

## Development steps

1. Add flag metadata to shared desktop/mobile navigation and filter it through
   one helper so Sidebar and BottomTabBar cannot drift.
2. Guard Calendar, Tasks, Settings, Subscription, lobby, and Dashboard route
   content. Disabled non-Dashboard routes redirect to `/` with a neutral
   unavailable message.
3. Keep `/` routable. When Dashboard is disabled, render a minimal
   authenticated landing state containing sign-out and, for admins, the
   feature-flag admin link; this also handles all product flags disabled.
4. Gate Dashboard widgets independently by their owning capabilities rather
   than hiding the entire Dashboard when only Calendar/Tasks/Notifications are
   disabled.
5. Gate lobby Tasks/Calendar/Settings tabs and direct `?tab=` access. Select
   the first enabled valid tab; Members remains part of Lobbies.
6. Filter CreateMenu actions and prevent AppShell from mounting disabled
   CreateLobby/Event/Task/ReserveSlot overlays. Close an already-open overlay
   when its flag changes to disabled.
7. Prevent globally mounted queries from calling protected APIs. Extend hooks
   such as lobby loading with an `enabled` option where AppShell still needs a
   legal shared read for another enabled capability.
8. Gate Settings sections with their real owner: notification preferences by
   Notifications and Subscription links by Subscriptions.
9. When a page receives authoritative `feature.disabled`, rely on UI-35
   invalidation; after refetch, close/redirect without leaving stale controls.
10. Add localized neutral unavailable copy in English and Ukrainian.

## Final / expected result

Every main capability can be disabled independently without exposing stale
routes/actions or producing avoidable protected requests. Composite pages
degrade by capability, runtime changes take effect without reload, and the app
retains a usable authenticated landing/sign-out path when everything is off.

## Test scenarios

For each of the seven keys, add at least one enabled and disabled test plus the
following cross-surface scenarios:

- Desktop Sidebar and mobile BottomTabBar expose exactly enabled destinations.
- Direct disabled route redirects to `/` and shows the neutral message.
- Disabled Dashboard shows the minimal root state without redirecting itself.
- All product flags disabled still permits sign-out and an admin link only for
  an administrator.
- Calendar disabled hides global/lobby calendar UI, free-slot actions, and does
  not call protected Calendar/free-slot APIs.
- Tasks disabled hides global/lobby task UI/actions and protected task calls.
- Lobbies disabled hides lobby management/invites while required shared lobby
  reads can support enabled Calendar/Tasks.
- Notifications disabled hides bell/preferences and does not poll the inbox.
- Settings and Subscriptions independently control their routes/menu entries.
- Invalid/disabled lobby `?tab=` selects the first enabled tab.
- A runtime flag transition closes its modal/drawer or redirects its page.
- Feature-disabled backend response causes refetch and eventual UI alignment.
- Existing responsive, accessibility, auth, and create-flow behavior remains
  unchanged while all flags are enabled.

## Verification

From `lined-web/` run:

```bash
npm run lint
npm run typecheck
npm run test:run
npm run build
```

Visually verify desktop and mobile navigation with all enabled, one disabled,
and all disabled. Also run `git diff --check` from the monorepo root.

## Non-goals

No prerequisite/dependency graph, partial targeting, alternative UI variants,
feature-specific data deletion, admin toggles, or changes to backend authority.
