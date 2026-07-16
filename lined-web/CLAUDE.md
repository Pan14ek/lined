# CLAUDE.md — Lined Web

> Quick reference for Claude Code. The canonical agent instructions for this
> sub-project are in [`AGENTS.md`](AGENTS.md) — read that first.

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

## Non-negotiables

1. Data fetching only through TanStack Query hooks in `src/hooks/`
2. Server data → TanStack Query; UI state → Zustand
3. Tailwind tokens only — no hex values
4. Never modify `src/components/ui/` (shadcn-owned)
5. MSW v2 for API mocking in tests — never mock `ky`
