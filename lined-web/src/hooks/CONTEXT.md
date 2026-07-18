# CONTEXT.md — `src/hooks/`

## Purpose

Domain-agnostic React hooks — no TanStack Query, no feature DTO, no API
call. Every feature-specific data-fetching hook (anything built on a
feature's `api/`) belongs in that feature's own `hooks/` folder instead;
see `docs/ARCHITECTURE.md`. This folder should stay small and stable.

## Structure

```
hooks/
  useDebouncedValue.ts          delays a value until it stops changing (search inputs)
  useFormState.ts                generic form state: values/errors/touched + set/markTouched
  useRowMutationState.ts         per-row busy-id + error-map state for list mutations
                                (resend/cancel/remove buttons in a table)
  useOptimisticPatchMutation.ts  wraps useMutation with optimistic single-object
                                cache patch + rollback-on-error
```

## Depends on

Nothing feature-specific — only `@tanstack/react-query` and React itself.

## Depended on by

All ten features, in varying combinations:
- `useDebouncedValue` — `lobby` (member search), `calendar` (conflict check debounce)
- `useFormState` — every `auth` page
- `useRowMutationState` — `lobby` (invites, member rows), `tasks` (Kanban board)
- `useOptimisticPatchMutation` — `notifications` (preference toggles)

## Testing

Each hook has a colocated test in `__tests__/`. These are pure-logic tests
(`renderHook` where needed) — no MSW required, since none of these hooks
touch the network. See root `docs/TESTING.md`.

## Known gaps

None — this folder is intentionally minimal and stable. If you're about to
add a fifth hook here, double-check it really has no domain knowledge
before it lands — that's the signal this folder is starting to absorb
feature logic it shouldn't.
