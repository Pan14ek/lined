# CONTEXT.md — `src/components/design-system/`

## Purpose

Lined's **public Design System** — the canonical, semantic UI vocabulary
every feature composes from. Each component wraps an internal primitive from
`src/components/ui/` (shadcn + Base UI) or, for simple presentational
components (`Card`, `Badge`), is implemented directly against semantic
tokens. Consumed as `@/components/design-system/{category}/{Component}`.

## Structure

```
design-system/
  actions/
    Button/        primary action control
    IconButton/     icon-only action control
  forms/
    TextField/      single-line text input
    Textarea/       multi-line text input
    Select/         fixed-option-set control
    Switch/         low-level boolean toggle
  data-display/
    Avatar/         image + text-fallback avatar (no DTOs)
    Badge/          short metadata/status pill
    Card/           compound surface (Card, CardHeader, CardContent, ...)
    Separator/       thin visual divider
  feedback/
    Alert/          inline status/warning/error banner
    Skeleton/        loading placeholder block
  overlays/
    Dialog/          centered modal shell
    Sheet/           side-anchored panel (drawer)
    DropdownMenu/    overflow/action menu
  navigation/
    Tabs/            tabbed navigation
```

Each component is `ComponentName/index.tsx` + `ComponentName/__tests__/` +
`ComponentName/*.stories.tsx` — mirroring the `src/components/` /
`src/features/{feature}/` convention.

## Rules

- **No feature/domain dependencies.** No `LobbyDto`/`TaskDto`/enum imports, no
  feature hooks, no API clients. Enforced by ESLint's `no-restricted-imports`
  (scoped to this directory, blocking `@/features/*`) and `npm run ui:check`.
- **Semantic props, not styling booleans.** `variant`, `tone`, `size`,
  `value`/`onValueChange`, `checked`/`onCheckedChange`, `open`/`onOpenChange`,
  `loading`, `disabled` — never `green`/`big`/`roundedBig`-style flags.
- **Semantic tokens only.** Colors come from `src/index.css`'s `@theme` block
  (`primary`, `success`, `warning`, `danger`/`destructive`, `info`,
  `muted`, ...) — never a hard-coded hex/rgb value. `npm run ui:check` flags
  literal color values in this directory.
- **May import:** `@/components/ui/*`, `@base-ui/react/*`,
  `class-variance-authority`, `lucide-react`, `@/lib/utils`. May import
  sibling `design-system/*` components (e.g. `ConfirmDialog` in `patterns/`
  composes `Dialog` + `Button` + `TextField` + `Alert` from here).
- **Accessibility comes from Base UI.** Don't hand-roll focus traps, keyboard
  navigation, or ARIA state machines for `Dialog`, `Sheet`, `Switch`,
  `Select`, or `DropdownMenu` — wrap the Base UI primitive under
  `src/components/ui/` and expose a semantic API here.
- **Avoid unnecessary wrappers.** Don't add a component that only forwards
  props with no real contract (a plain `<div className="flex">{children}</div>`
  isn't a Design System component).

## Adding a new component

1. Confirm no existing public component covers the need (browse
   `npm run storybook`, or search this directory).
2. Check whether `src/components/ui/` already has (or the shadcn CLI can add)
   a suitable low-level primitive.
3. Define a minimal semantic TypeScript API; add JSDoc to non-obvious props.
4. Implement, add `__tests__/index.test.tsx` (positive + negative coverage),
   and add `*.stories.tsx` covering its meaningful states (see any existing
   component for the expected breadth — e.g. `Button`'s stories cover every
   variant, size, and the loading/disabled states).
5. Run `npm run ui:check`, `npm run lint`, `npm run typecheck`,
   `npm run test:run`, `npm run build-storybook`.
6. Only then consume it in feature code.

## Known gaps

- `Avatar` has no per-item loading (pulsing) fallback state — see
  `../CONTEXT.md`'s "Known gaps" for the one feature (`LobbyHeader`) still on
  a direct `ui/avatar` import because of this.
- `SearchField` and `SegmentedControl` (from the original design proposal)
  are not yet implemented — no current call site clearly justified them over
  `TextField`/existing feature-local controls. Add them "public-first" the
  moment a real use case appears (see the promotion decision tree in
  `lined-web/AGENTS.md`).
