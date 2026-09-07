# Project Structure

A map of `src/`, and the naming rules to follow when adding files. See
[ARCHITECTURE.md](ARCHITECTURE.md) first for *why* it's organized this way.

> Every top-level folder under `src/` (each `features/{feature}/` and each
> of `components/`, `hooks/`, `lib/`, `store/`, `test/`) has its own
> `CONTEXT.md` — purpose, structure, API surface, and cross-folder
> dependencies for that folder specifically. Read the relevant one before
> working in a folder; this document is the map, `CONTEXT.md` is the detail.

## Top level

```
src/
  App.tsx            root component (providers)
  main.tsx           entry point; starts the MSW worker when VITE_ENABLE_MSW=true
  router.tsx          the only file that assembles the route tree
  index.css
  vite-env.d.ts       ImportMetaEnv typings (VITE_API_BASE_URL, VITE_ENABLE_MSW, VITE_USE_MOCKS)

  features/           one folder per business domain — see below
  components/         SHARED, domain-agnostic components only
  hooks/              SHARED, domain-agnostic hooks only
  lib/                SHARED infra: apiClient.ts, apiErrors.ts, utils.ts
  store/              global Zustand stores (auth, calendar, createMenu)
  test/               test infrastructure (MSW server/browser, render helpers)
```

Never put a domain-specific file at these top-level locations — it belongs
under `features/{feature}/`. See the ownership rule in
[ARCHITECTURE.md](ARCHITECTURE.md#the-ownership-rule-feature-owned-vs-shared)
if you're unsure where something goes.

## `src/features/{feature}/`

Every feature is a folder under `src/features/`. Current features: `auth`,
`calendar`, `dashboard`, `layout`, `lobby`, `notifications`, `settings`,
`subscription`, `tasks`, `users`.

A feature only has the subfolders it actually needs:

```
features/{feature}/
  model/
    index.ts                   all DTOs/enum types for this domain
  api/
    prod.ts                    real ky requests
    dev.ts                     in-memory mock implementation (same exports as prod.ts)
    index.ts                   picks dev.ts or prod.ts via VITE_USE_MOCKS
    mockData.ts                seed fixture data — single source of truth
    handlers.ts                MSW request handlers for tests (reads mockData.ts)
  hooks/
    use{Thing}.ts               TanStack Query hooks built on ./api
    __tests__/
  lib/
    {thing}Utils.ts             pure formatting/computation helpers
    constants.ts                 QUERY_KEYS + any domain lookup tables/enums-to-label maps
    __tests__/
  pages/
    {Domain}Page.tsx             route-level component
    __tests__/

  {ComponentName}.tsx            flat components used directly by pages/other features
  {topic}/                       subfolder grouping a feature's larger component sets
    {ComponentName}.tsx
    __tests__/
  __tests__/                     tests for the feature's flat (non-subfoldered) components
```

**When to group components into a `{topic}/` subfolder:** once a feature
has enough components that a flat list gets hard to scan (roughly 5+), group
them by what they're used for together — not by arbitrary alphabetizing.
Existing examples:

| Feature | Subfolders |
|---|---|
| `calendar` | `grid/` (MonthGrid, WeekGrid, CalendarLegend, WeekEmptyBanner), `events/` (CreateEventModal, ReserveSlotModal, ConflictBanner), `panels/` (DayAgendaPanel, EventDetailPanel) |
| `lobby` | `header/`, `members/`, `calendar/`, `settings/`, `tasks/` |
| `dashboard` | `lobbies/` (LobbyCard, LobbyCardGrid), `widgets/` (MyTasksList, StatusBadge, UpcomingEventsList, FreeSlotBanner) |
| `settings` | `cards/` (the five settings section cards; SettingsCard/SettingsRow/SettingsMenu stay flat — they're shared *within* the feature) |
| `tasks` | `kanban/` (KanbanBoard, KanbanCard, KanbanColumn, KanbanFilters, kanbanConstants.ts) |
| `notifications` | `bell/` (NotificationBell, NotificationInbox — InviteCard stays flat since both `bell/` and the dashboard's PendingInvitesBanner use it) |

A single file with no siblings in its concern (e.g. `lobby/CreateLobbyModal.tsx`,
`tasks/TaskDrawer.tsx`) stays flat at the feature root rather than being
forced into a one-file subfolder.

## `src/components/` (internal primitives, Design System, patterns)

```
components/
  ui/                    INTERNAL shadcn/Base UI primitives — NEVER import from features/
  design-system/         PUBLIC Design System, by category:
    actions/{Button,IconButton}/
    forms/{TextField,Textarea,Select,Switch}/
    data-display/{Avatar,Badge,Card,Separator}/
    feedback/{Alert,Skeleton}/
    overlays/{Dialog,Sheet,DropdownMenu}/
    navigation/{Tabs}/
  patterns/              PUBLIC reusable compositions:
    {FieldRow,SwitchField,SectionCard,SectionHeader,EmptyState,ErrorState,ConfirmDialog}/
  skeletons/             Feature-agnostic skeleton shapes (SkeletonRow, SkeletonCard, SkeletonAvatar)
```

Each `design-system/`/`patterns/` component is its own folder:

```
ComponentName/
  index.tsx
  __tests__/
    index.test.tsx
  ComponentName.stories.tsx
```

Import as `@/components/design-system/{category}/ComponentName` or
`@/components/patterns/ComponentName` — module resolution finds `index.tsx`
automatically. Feature code must consume these, not `@/components/ui/*` or
`@base-ui/react/*` directly (ESLint-enforced; see
`src/components/CONTEXT.md`). Full catalog, rules, and how to add a new
component: `src/components/design-system/CONTEXT.md` and
`src/components/patterns/CONTEXT.md`.

A `design-system/`/`patterns/` component only belongs there if it has **no
opinion about any feature's DTO shape**. If it renders/uses `LobbyDto`,
`TaskDto`, etc., it belongs in the feature that owns that model — typically
as a thin **domain wrapper** over a public component (e.g. `TaskStatusBadge`,
`UserAvatar`), even if the wrapper itself feels "generic" in spirit.

## Tests

Every test lives in a `__tests__/` folder colocated with the code it tests,
never in a separate top-level test tree (except `src/test/`, which is
infrastructure, not feature tests). See [TESTING.md](TESTING.md) for
conventions and what to cover.

## Import paths

- `@/` → `src/` (configured in `tsconfig` + Vite alias).
- Within a feature, sibling files use relative imports (`./Sibling`,
  `../hooks/useThing`).
- Cross-feature imports always use the `@/features/{feature}/...` alias —
  never a `../../` relative path that reaches into another feature.
