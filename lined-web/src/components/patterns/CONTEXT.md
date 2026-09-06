# CONTEXT.md — `src/components/patterns/`

## Purpose

Reusable, **domain-agnostic** compositions of the Design System — one level
above `src/components/design-system/`. A pattern combines two or more public
components into a recurring layout (a settings row, a section card, an empty
state) but still has no opinion about any feature's DTO shape.

## Structure

```
patterns/
  FieldRow/        label(+description) on one side, a control on the other
  SwitchField/     FieldRow + Switch composition (replaces the old ToggleRow)
  SectionCard/     page-section card shell (header + body + optional footer)
  SectionHeader/    heading row for a page section, with an optional action
  EmptyState/      empty-list placeholder (icon, title, description, action)
  ErrorState/      failed-data-fetch placeholder with a retry action
  ConfirmDialog/   "are you sure?" prompt built on Dialog + Button + TextField + Alert
```

Each is `ComponentName/index.tsx` + `ComponentName/__tests__/` +
`ComponentName/*.stories.tsx`, same convention as `design-system/`.

## Rules

Same boundary as `design-system/` (see its `CONTEXT.md`): no feature/domain
dependencies, semantic props, semantic tokens only, enforced by ESLint +
`npm run ui:check`.

- **May import:** `@/components/design-system/*`. Avoid reaching into
  `@/components/ui/*` directly unless there's a strong implementation reason
  (none of the current patterns need to).
- **`AsyncContent`-style props over library objects.** If a pattern needs
  loading/error/empty state, it takes plain booleans
  (`loading`/`error`/`empty`) — never a TanStack Query object — so the UI
  layer stays data-library agnostic. (No `AsyncContent` pattern exists yet;
  add it "public-first" per the promotion rule below once a second call site
  wants the same three-state boolean contract as an existing ad-hoc
  loading/error/empty block.)

## Where these came from (known migrations)

- `SwitchField` replaces the old feature-agnostic `ToggleRow`.
- `EmptyState`/`ErrorState` replace the old top-level `EmptyState`/
  `LoadErrorState` (renamed `message` → `title`, added `description`/`size`).
- `ConfirmDialog` replaces the old top-level `ConfirmDialog` — now built on
  the Design System `Dialog` (Base UI: real focus trap, escape-to-close,
  inert background) instead of a hand-rolled backdrop `<div>`. Its call sites
  now pass `open`/`onOpenChange` instead of conditionally mounting the
  component, and `danger`/`message`/`confirmText` were renamed to
  `tone`/`description`/`confirmationText` to match the rest of the catalog.
- `SectionCard`/`FieldRow` are close cousins of the still feature-owned
  `features/settings/SettingsCard` and `SettingsRow` — those were **not**
  migrated in this change (9 call sites across `settings`, `lobby`, and
  `subscription`); promoting them is a good candidate for a focused
  follow-up now that the pattern shape already exists here.

## Second-unrelated-use-case rule

A new pattern belongs here only once **two unrelated features** need the same
shape. Until then, keep the composition feature-local (built from
`design-system/*` components) — see the promotion decision tree in
`lined-web/AGENTS.md`, "UI Design System workflow".
