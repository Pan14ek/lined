# Task 22 — Responsive Layout (Mobile & Tablet)

**Branch:** `feature/ui-22-responsive-layout`

*Depends on nothing functionally, but land Tasks 19–21 first — this task
touches most screens and would conflict with them. Largest task in this
batch; can be split per page if needed.*

## Detailed description

The mockups are 1440 px desktop-first and the app was only ever verified at
1280×800. On a phone the fixed 240 px sidebar, seven-column week grid and
three-column kanban are unusable — yet a schedule-sync app is exactly the
thing couples open on their phones. (A native app exists in `mobile/Lined`,
but the web app is the shareable, no-install surface and should not break.)

Target breakpoints (Tailwind defaults): **`< md` (phone)**, **`md–lg`
(tablet)**, **`≥ lg` (current desktop, unchanged)**.

1. **App shell** — under `lg`: sidebar becomes an off-canvas drawer opened
   by a ☰ button; on phones a fixed bottom tab bar (Dashboard / Calendar /
   Tasks) becomes the primary nav; top bars compress (icon buttons, smaller
   greeting).
2. **Dashboard** — single-column stack: invites, lobby cards (full-width),
   free-slot banner, events, tasks.
3. **Calendar** — under `md` the week grid becomes a **day view**: a
   horizontal strip of day chips (swipe/scroll, today highlighted) above a
   single-day time column with the same event blocks, free-slot bands and
   now-line; "+ New event" becomes a floating action button. Month view
   shrinks to dots-per-day; day tap opens the existing `DayAgendaPanel`.
4. **Tasks board** — columns become full-width horizontal scroll-snap
   panes; card ←/→ status buttons remain the primary move mechanism
   (drag-and-drop stays desktop-only).
5. **Modals & drawers** — all modals (`CreateEventModal`,
   `CreateLobbyModal`, `ReserveSlotModal`, `ConfirmDialog`) render as
   full-screen sheets under `md`; the task/add-task drawer and
   `EventDetailPanel` become bottom sheets.
6. **Settings / lobby pages** — two-pane settings stack to one column;
   lobby tab bar scrolls horizontally if needed.

## Idea of this task

"Where life and quality time meet" happens on phones. Desktop-only layouts
lock the product out of its primary usage moment; this brings the existing
features to small screens without redesigning them.

## Reference to mockup

- New screen id **`mobile`** (`http://localhost:4321/#mobile`): two 390 px
  phone frames — Dashboard (single column, app bar with ☰ + bell, bottom
  tab bar) and Calendar day view (day-chip strip, full-width event blocks,
  tappable free-slot band, FAB).

## Development steps

1. `AppShell`/`Sidebar`: drawer state in a Zustand UI store; `☰` trigger
   in each page's top bar under `lg`; `BottomTabBar` component on phones;
   verify focus trap + body scroll lock for the drawer.
2. Dashboard + settings + lobby pages: Tailwind responsive classes
   (`grid-cols-1 md:grid-cols-2 …`) — no JS changes.
3. Calendar: add a `day` view mode to the calendar store, reusing
   `WeekGrid`'s hour-grid internals with a 1-day column set; day-chip
   strip component; FAB. Force `day` under `md` (auto, not user-set).
4. Kanban: `snap-x` scroll container under `md`; ensure ←/→ buttons have
   ≥ 44 px touch targets.
5. Modals/drawers: responsive classes on the shared overlay/panel wrappers
   (full-screen / bottom-sheet under `md`).
6. Tests: viewport-conditional rendering is hard to assert in jsdom — unit
   test the store/view-mode logic (day-view forcing, drawer open/close)
   and rely on manual verification at 390 px (iPhone), 768 px (tablet) and
   1280 px (regression: desktop must be pixel-identical).

## Final / expected result

- Every existing flow is usable one-handed at 390 px, sensible at 768 px,
  and unchanged at ≥ 1024 px.
- Lint, typecheck, tests, build pass; manual pass at the three widths
  documented in the PR (screenshots).

## REST API used

None — layout only.
