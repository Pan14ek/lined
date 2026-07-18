# CONTEXT.md — `src/components/`

## Purpose

Domain-agnostic, presentational components — code that could be dropped
into a different app with no `LobbyDto`/`TaskDto`/etc. knowledge and still
make sense. This is a **deliberately small** folder; most components belong
to a feature (see `docs/ARCHITECTURE.md`, "The ownership rule"). Before
adding here, ask: *does this component know what a lobby, task, or event
is?* If yes, it belongs under `src/features/{feature}/`, not here.

## Structure

```
components/
  ui/                    shadcn/ui primitives — NEVER edit directly, wrap instead
  AssigneeAvatar/        index.tsx + __tests__/index.test.tsx
  ConfirmDialog/         index.tsx + __tests__/index.test.tsx
  EmptyState/            index.tsx + __tests__/index.test.tsx
  FormField/             index.tsx + __tests__/index.test.tsx
  ToggleRow/              index.tsx + __tests__/index.test.tsx
```

Each component is its own folder — `ComponentName/index.tsx` +
`ComponentName/__tests__/index.test.tsx`. Import as
`@/components/ComponentName`; directory-index module resolution finds
`index.tsx` automatically, exactly like importing a single file.

## What's here and why

- `AssigneeAvatar` — technically takes a `UserDto | undefined`, but it only
  reads `.username` for an initial; it's a generic "avatar with a fallback"
  shape, reused by `lobby`, `tasks`, and `calendar`.
- `ConfirmDialog` — a generic "are you sure?" modal (title, message, confirm/
  cancel), used by settings, lobby, tasks, and subscription for unrelated
  destructive actions.
- `EmptyState` — icon + message + optional action, used everywhere a list
  can be empty.
- `FormField` — labeled input wrapper with validation-error display, used
  by every auth/settings form.
- `ToggleRow` — labeled switch row, used by every notification-preferences
  toggle across `settings` and `lobby`.

## Testing

Every component has positive (renders expected output) and negative
(missing/empty prop, error state) coverage in its `__tests__/index.test.tsx`.
See root `docs/TESTING.md`.

## Known gaps

None — this folder is intentionally minimal and stable.
