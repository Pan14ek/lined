# CLAUDE.md — Lined Web

> Quick reference for Claude Code. The canonical agent instructions for this
> sub-project are in [`AGENTS.md`](AGENTS.md) — read that first.

## Read before writing any code

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — feature-folder structure,
  shared-vs-feature-owned rule, the API `dev.ts`/`prod.ts` mock-switch
  pattern.
- [`docs/PROJECT_STRUCTURE.md`](docs/PROJECT_STRUCTURE.md) — exact directory
  layout and naming conventions.
- [`docs/TESTING.md`](docs/TESTING.md) — testing conventions; every
  component/util file needs positive + negative test coverage.

## Where work comes from

- Task plan: `docs/UI_TASKS.md` (table) + `docs/tasks/UI-NN-*.md` (specs)
- One task per branch/PR, branch name from the table, update Status in the same PR

## Safe commands (from `lined-web/`, Node 22 — `nvm use` first)

```bash
npm run lint
npm run typecheck
npm run test:run
npm run build
```

## Code Review Standards
After completing any implementation, review the code for:
- Functions longer than 30 lines (likely doing too much)
- Logic duplicated more than twice (extract to utility)
- Any `any` type usage in TypeScript (replace with real types)
- Components with more than 3 props that could be grouped into an object
- Missing error handling on async operations

Run /simplify before presenting code to the user.

## Non-negotiables

1. Feature-first organization: a feature's model/api/hooks/lib/pages/UI
   live under `src/features/{feature}/`; only truly domain-agnostic code
   goes in top-level `src/components/`, `src/hooks/`, `src/lib/` — see
   `docs/ARCHITECTURE.md`
2. Data fetching only through TanStack Query hooks in
   `features/{feature}/hooks/` (or shared `src/hooks/` for generic hooks)
3. Server data → TanStack Query; UI state → Zustand
4. Tailwind tokens only — no hex values
5. Never modify `src/components/ui/` (shadcn-owned)
6. MSW v2 for API mocking in tests — never mock `ky`
7. Every component/util file has a test file with positive + negative
   coverage — see `docs/TESTING.md`
