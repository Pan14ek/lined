# CONTEXT.md — `src/components/`

## Purpose

The UI layer that sits below `src/features/`: internal primitives, the public
Design System, and reusable domain-agnostic compositions. Layered as:

```
semantic tokens (src/index.css)
        ↓
ui/              INTERNAL shadcn + Base UI primitives
        ↓
design-system/   PUBLIC Design System — Button, TextField, Dialog, Badge, ...
        ↓
patterns/        PUBLIC reusable compositions — FieldRow, SectionCard, ConfirmDialog, ...
        ↓
domain wrappers (feature-owned, e.g. TaskStatusBadge, UserAvatar)
        ↓
feature components → pages
```

## Structure

```
components/
  ui/                    INTERNAL shadcn/Base UI primitives — never import from features/
  design-system/         PUBLIC Design System — see design-system/CONTEXT.md
    actions/    Button, IconButton
    forms/      TextField, Textarea, Select, Switch
    data-display/  Avatar, Badge, Card, Separator
    feedback/   Alert, Skeleton
    overlays/   Dialog, Sheet, DropdownMenu
    navigation/ Tabs
  patterns/              PUBLIC reusable compositions — see patterns/CONTEXT.md
    FieldRow, SectionCard, SectionHeader, EmptyState, ErrorState,
    SwitchField, ConfirmDialog
  skeletons/             Feature-agnostic skeleton shapes (SkeletonRow, SkeletonCard, SkeletonAvatar)
```

## The public/internal boundary

`ui/` is **never** imported from `src/features/**`, and never re-exported
verbatim by a feature. Feature code (and `patterns/`) consumes
`@/components/design-system/*` and `@/components/patterns/*` instead. This is
enforced by:

- `eslint.config.js`'s `no-restricted-imports` rule scoped to `src/features/**`
  (blocks `@/components/ui/*` and `@base-ui/react/*`, with a documented
  `eslint-disable-next-line` as the only escape hatch);
- `npm run ui:check` (`scripts/ui-check.mjs`), which also verifies every
  public component has a story + tests, that the public layer never imports
  `@/features/**`, and flags hard-coded colors in `design-system/`/`patterns/`.

`design-system/` and `patterns/` must have **no feature/domain dependencies**
(no `LobbyDto`, `TaskDto`, feature hooks, or API clients). A component that
needs domain data belongs in the owning feature as a **domain wrapper**
(`TaskStatusBadge`, `LobbyTypeBadge`, `UserAvatar` in `src/features/users/`) —
a thin adapter that maps an enum/DTO to the public component's semantic props,
without duplicating its geometry.

## What's here and why (non design-system/patterns)

- `skeletons/` — generic loading-placeholder shapes reused across features
  (`SkeletonRow`, `SkeletonCard`, `SkeletonAvatar`); kept separate from the
  Design System's own `Skeleton` primitive since these compose it into
  specific row/card/avatar shapes.

## Testing

Every public component in `design-system/`/`patterns/` has positive/negative
coverage in its `__tests__/index.test.tsx` and a `*.stories.tsx` covering its
meaningful states (Storybook is the executable catalog and a11y surface —
it supplements these tests, it does not replace them). See root
`docs/TESTING.md`.

## Known gaps

- `LobbyHeader`'s per-member avatar stack still imports `@/components/ui/avatar`
  directly (documented `eslint-disable-next-line` exception) — the public
  `Avatar`/`UserAvatar` API doesn't yet support a per-item loading fallback
  state. Revisit once that's added to the Design System.
- `test:storybook` (Storybook's Vitest/browser-mode addon) is not wired up:
  `@storybook/addon-vitest@10.6.0` requires `@vitest/browser-playwright@^4.0.0`,
  but this project pins `vitest@3.2.4`. Upgrading the project's Vitest major
  is a separate, riskier migration outside this change's scope.
