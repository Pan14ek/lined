# Architecture

How `lined-web` is organized, and the reasoning behind it. Read this before
adding a new file — it tells you where it belongs.

## The core idea: feature folders

The app used to be organized by **technical layer** — one `src/components/`
for every component in the app, one `src/hooks/` for every hook, one
`src/api/` for every API call, one `src/types/index.ts` for every DTO. That
worked while the app was small, but it meant a single change (e.g. "how does
a lobby invite work?") touched five unrelated top-level folders, and nothing
signaled which files belonged together.

The app is now organized by **feature** — a business domain such as
`calendar`, `lobby`, or `subscription`. Each feature owns everything it
needs to function:

```
src/features/{feature}/
  model/        DTOs and enum types for this domain
  api/          prod.ts, dev.ts, index.ts — the HTTP layer
  hooks/        TanStack Query hooks built on api/
  lib/          domain utilities and constants (formatters, QUERY_KEYS, ...)
  pages/        route-level components (*Page.tsx)
  <component folders>   UI components, grouped by sub-topic
```

Not every feature has every subfolder — a feature only gets `api/`, `hooks/`,
`lib/`, or `model/` if it actually owns that kind of code. See
[PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for the full current layout and
naming conventions.

### Current features

`auth`, `calendar`, `dashboard`, `layout`, `lobby`, `notifications`,
`settings`, `subscription`, `tasks`, `users`.

`users` is worth calling out: it wasn't an obvious "feature" from a product
perspective (there's no standalone Users page), but `UserDto`, user lookup,
and user search are consumed by `auth`, `lobby`, `tasks`, `calendar`, and
`dashboard` alike. Rather than force it into one of those or leave it in a
shared bucket, it became its own feature — the same way `calendar` is its
own feature even though `lobby` embeds a calendar tab. **A feature doesn't
have to map 1:1 to a nav item; it maps to a cohesive slice of domain data and
logic that other features are allowed to depend on.**

## The ownership rule: feature-owned vs. shared

This is the single most important judgment call in the codebase, and it
comes up every time you add a file:

> **If a piece of code is fetched, fetches, or formats data of that
> feature's model, it belongs in that feature. If it's generic — it has no
> opinion about what a `LobbyDto` or `TaskDto` is — it's shared.**

Shared code lives at the top of `src/`, outside any feature folder:

- `src/components/` — presentational components with no domain data:
  `AssigneeAvatar`, `ConfirmDialog`, `EmptyState`, `FormField`, `ToggleRow`,
  and the shadcn-owned `components/ui/` (never edit those directly — wrap
  them). Each component is `ComponentName/index.tsx` +
  `ComponentName/__tests__/index.test.tsx` — see
  [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md).
- `src/hooks/` — hooks with no domain data: `useDebouncedValue`,
  `useFormState`, `useRowMutationState`, `useOptimisticPatchMutation`.
- `src/lib/` — `apiClient.ts` (the `ky` instance + `MockHttpError`/
  `getErrorStatus`/`mockDelay`/`toSearchParams`/`requestVoid`), `apiErrors.ts`
  (`getApiErrorMessage`), `utils.ts` (`cn`). These are infrastructure every
  feature's `api/` and components depend on — nobody "owns" them.
- `src/store/` — global Zustand stores (`auth`, `calendar` view state,
  `createMenu` overlay state) that many features read/write.
- `src/test/` — test infrastructure: MSW server/browser wiring, render
  helpers, and small fixture-copy helpers reused across multiple features'
  tests.

Before adding a new util, ask: *would a second, unrelated feature ever need
this without needing to know about my feature's data shape?* If yes, it's
shared. If the honest answer is "well, in practice only my feature calls
this," it's feature-owned, even if it's technically type-agnostic.

**Cross-feature imports are normal and expected**, not a code smell to
avoid. A feature reaching into another feature's `model/`, `api/`, `hooks/`,
or a specific component is fine when the dependency is real:

- `lobby`'s calendar tab (`features/lobby/calendar/LobbyCalendarView.tsx`)
  imports `CalendarTopBar`, `WeekGrid`, `CreateEventModal` etc. straight from
  `features/calendar/` rather than duplicating calendar rendering.
- `dashboard`'s free-slot widgets import `lobby`'s `getFreeSlots` API
  function and `QUERY_KEYS`, because free slots are fundamentally a lobby
  concept the dashboard is just displaying.
- `layout/AppShell.tsx` (the app shell) composes overlays from `lobby`,
  `calendar`, and `tasks` — it has to reach into all three by construction.

What's *not* fine is duplicating a feature's model or logic into another
feature to avoid an import. If two features need the same DTO shape, one of
them owns it and the other imports it.

## The UI layer: internal primitives → public Design System → patterns

Below the feature-first split above, `src/components/` has its own internal
layering:

```
semantic tokens (src/index.css)
        ↓
components/ui/            INTERNAL shadcn + Base UI primitives
        ↓
components/design-system/ PUBLIC Design System (Button, TextField, Dialog, ...)
        ↓
components/patterns/      PUBLIC reusable compositions (FieldRow, ConfirmDialog, ...)
        ↓
domain wrappers (feature-owned, e.g. TaskStatusBadge, UserAvatar)
        ↓
feature components → pages
```

`components/ui/` is shadcn/Base UI-owned and never edited directly (unchanged
from before) — but it is now also off-limits to feature code: nothing under
`src/features/` may import it directly anymore. Feature code consumes
`@/components/design-system/*` and `@/components/patterns/*` instead, which
is enforced by ESLint's `no-restricted-imports` and `npm run ui:check`, not
just convention.

The public layer (`design-system/` + `patterns/`) follows the same
ownership rule as the rest of the app, one level stricter: it must have **no**
feature/domain dependency at all (no `LobbyDto`, no feature hooks). A
component that needs domain data is a feature-owned **domain wrapper** —
`TaskStatusBadge` maps `TaskStatus` → `Badge`'s `tone`/label, `UserAvatar`
(in `features/users/`) maps a `UserDto` → `Avatar`'s `fallback`/`tone`. The
wrapper owns the domain mapping; the public component owns the geometry.

Storybook (`npm run storybook`) is the executable catalog, documentation, and
accessibility surface for `design-system/` and `patterns/`, and the interface
coding agents use for UI discovery via its MCP addon — see
`src/components/design-system/CONTEXT.md`, `src/components/patterns/CONTEXT.md`,
and `lined-web/AGENTS.md`'s "UI Design System workflow" for the full contract.

## The API layer: `prod.ts` / `dev.ts` / `index.ts`

Every feature that talks to the backend has this shape in `api/`:

```
features/{feature}/api/
  prod.ts       real requests via src/lib/apiClient's `ky` instance
  dev.ts        in-memory mock implementation, same function signatures
  index.ts      picks one based on VITE_USE_MOCKS, re-exports it
  mockData.ts   seed data dev.ts (and MSW handlers.ts, for tests) read from
  handlers.ts   MSW request handlers used only by tests (not shipped)
```

`index.ts` looks like this:

```ts
import { USE_MOCKS } from '@/lib/apiClient';
import * as devApi from './dev';
import * as prodApi from './prod';

const impl = USE_MOCKS ? devApi : prodApi;

export const { getMyLobbies, getLobby, createLobby /* ... */ } = impl;
```

`dev.ts` and `prod.ts` **must export the exact same function names and
signatures** — that's what makes the ternary type-check and makes it safe to
flip `VITE_USE_MOCKS` without touching any calling code. `dev.ts` mocks throw
`MockHttpError(status, message)` on failure paths (not-found, conflict,
validation) instead of a real `ky` `HTTPError`, so error-status checks must
go through `getErrorStatus(error)` from `apiClient.ts` (which recognizes
both), never a bare `error instanceof HTTPError`.

**Why two separate mock mechanisms exist:** `VITE_ENABLE_MSW` (in
`src/main.tsx`) starts an MSW service-worker that intercepts real network
calls made through `ky` — it's the *test* mocking layer, and it's also
wired into the live dev server for browsing without a backend. `dev.ts` +
`VITE_USE_MOCKS` is a second, independent switch that bypasses `ky` and the
network entirely, resolving in-memory instead. They serve different
purposes and can be toggled independently:

| Flag | Mechanism | Typical use |
|---|---|---|
| `VITE_ENABLE_MSW=true` | Service worker intercepts `fetch` | Always on in tests (`src/test/server.ts`); optional in dev browsing |
| `VITE_USE_MOCKS=true` | `api/index.ts` swaps in `dev.ts`, no network at all | Local dev without a backend or MSW running |

Only enable one at a time in `.env.local` — enabling both is harmless
(`VITE_USE_MOCKS` wins, since `dev.ts` never calls `ky`), but there's no
reason to run two mocking layers together.

`mockData.ts` is the single source of truth for a feature's fixture data.
`dev.ts` clones it into an in-memory mutable store; `handlers.ts` (used only
by MSW/tests) reads the same arrays. If you need a new fixture record, add
it once in `mockData.ts` — both the dev-mode app and the test suite pick it
up.

## Hooks and query keys

Each feature's `hooks/` folder holds its TanStack Query hooks, built on that
feature's `api/`. Query cache keys live in that feature's
`lib/constants.ts` as a `QUERY_KEYS` object — every feature keeps the same
export name (`QUERY_KEYS`), so call sites read identically
(`QUERY_KEYS.lobbies`, `QUERY_KEYS.tasks`, ...) regardless of which feature
they're imported from; only the import path changes. A hook file that needs
another feature's keys (e.g. `dashboard`'s `useDashboard.ts` invalidating
`lobby`'s free-slots key) imports that feature's `QUERY_KEYS` directly —
this is a normal cross-feature import, not a smell.

## Route pages live inside features

`{Domain}Page.tsx` route components live in `features/{feature}/pages/`, not
in a central `src/pages/`. `src/router.tsx` imports each page from its
feature and is the only place that assembles the route tree.

## Types

Every DTO/enum lives in the feature that owns that data, under
`features/{feature}/model/index.ts`. There is no central `src/types/`
anymore. If a type is used by five features, it still has exactly one owner
— the feature whose backend resource it mirrors — and the other four import
it from there.

## Where this came from

This structure is the result of a full-repo refactor (see the project's git
history for the sequence of commits) that moved the app from
layer-first (`components/`, `hooks/`, `api/`, `types/`, `lib/`,
`pages/`) to feature-first organization, one concern at a time:

1. Components and pages grouped into `src/features/{feature}/`, converting
   `function` declarations to arrow functions along the way.
2. `src/types/index.ts` split into per-feature `model/` folders.
3. `src/api/*.ts` split into per-feature `api/` folders, and extended with
   the `dev.ts`/`prod.ts`/`index.ts` mock-switch pattern described above.
4. `src/hooks/*.ts` split into per-feature `hooks/` folders (generic hooks
   stayed shared).
5. `src/lib/*.ts` (including the mixed-domain `constants.ts`) split into
   per-feature `lib/` folders (generic infra stayed shared).
6. Shared `src/components/*.tsx` files each moved into their own
   `ComponentName/index.tsx` + `ComponentName/__tests__/` folder.

Each step was driven by the same question: **does this file's content
belong to one domain, or is it truly generic?** That question is the
ownership rule above, and it's the one to keep asking as the app grows.
