# Task 32 — Styling Foundations

**Branch:** `feature/ui-32-style-foundations`

Refactor shared styling composition without changing application behavior or visual output.

## Development steps

1. Replace conditional or caller-supplied template-literal class strings in shared components with `cn()`.
2. Move the task-status visual into `features/tasks/TaskStatusBadge`, with CVA status and size variants; update dashboard and lobby task consumers.
3. Add `features/lobby/LobbyTypeBadge`, with CVA type and size variants; update the repeated lobby-type badge consumers.
4. Add colocated tests for new badge variants and retain the existing shared-component coverage.

## Expected result

Task and lobby visual state is owned by the corresponding feature, every external class override is merged safely, and no generic shadcn component is changed.

## Verification

`npm run lint`, `npm run typecheck`, `npm run test:run`, and `npm run build` pass. Compare affected dashboard, lobby, and tasks screens with the mockups at 1280x800.
