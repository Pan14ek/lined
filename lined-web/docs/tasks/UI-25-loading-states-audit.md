# Task 25 — Loading States & Skeleton System

**Branch:** `feature/ui-25-loading-states-audit`

*No dependencies; pairs naturally with Task 21 (empty states) — loading,
empty, and error are the three non-happy states of every list.*

## Detailed description

The conventions say "every data-fetching component needs a skeleton or
spinner", and many have one — but each was improvised per-task, so shapes,
shimmer, and coverage vary, and some surfaces still pop in abruptly. This
task turns loading into a designed system with three tiers:

1. **Route-level skeletons** — each page shows a skeleton that mirrors its
   real layout (same card sizes/positions, so content replaces gray blocks
   with **zero layout shift**): dashboard (lobby cards + two list columns +
   sidebar lobby rows), calendar (top bar + grid), tasks board (three
   columns of card blocks), lobby page (header + tab content), settings
   (menu + cards), subscription.
2. **Section-level** — a section that refetches independently (notification
   inbox, pending invites, free-slot banner, day agenda) skeletons only
   itself.
3. **Action-level** — every mutation button gets a pending state (spinner
   replaces label, button disabled, width preserved) via a shared
   `Button`-wrapper pattern; mutations that are already optimistic (task
   status, notification read) correctly show **no** loading at all — that
   stays the preferred pattern where rollback is cheap.

Rules to encode once and reuse: skeletons come from shadcn `Skeleton` with
one shared shimmer; **no full-page spinners**; skeleton appears only when
data isn't cached (TanStack `isLoading`, not `isFetching` — background
refetches must not flash skeletons); a >10s stall falls back to the error
state with retry, never an infinite shimmer.

## Idea of this task

Perceived speed is UX: skeletons that mirror the layout make the app feel
instant on slow networks, while inconsistent improvised loaders make even
a fast app feel janky. One system, applied everywhere, also gives Tasks
28–30 something to inherit.

## Reference to mockup

- New screen id **`loading`** (`http://localhost:4321/#loading`): the
  dashboard mid-fetch — shimmering `.skel` blocks shaped like lobby cards,
  event rows, task rows, and sidebar lobby items, with static chrome
  (topbar, nav, buttons) fully rendered.

## Development steps

1. Shared primitives in `src/components/skeletons/`: `SkeletonCard`,
   `SkeletonRow`, `SkeletonAvatar`, plus per-page compositions
   (`DashboardSkeleton`, `CalendarSkeleton`, `KanbanSkeleton`, …) built
   from shadcn `Skeleton`.
2. Audit every `isLoading` branch; replace ad-hoc spinners/gaps with the
   skeleton compositions; verify against the mockup that shapes match the
   loaded layout (measure: no CLS when data arrives).
3. Sweep mutation buttons into the shared pending-state pattern (disable +
   spinner, preserve width); confirm optimistic mutations stay
   spinner-free.
4. Tests: each page renders its skeleton while MSW delays the response
   (`delay()`), then swaps to content; background refetch does not
   re-show the skeleton (seed the query cache); a pending mutation
   disables its button.

## Final / expected result

- Every route and refetching section has a layout-mirroring skeleton, every
  mutation has a visible pending state, and nothing flashes or shifts when
  data lands.
- Lint, typecheck, tests, build pass.

## REST API used

None — presentation only (MSW `delay()` used in tests/dev to exercise the
states).
