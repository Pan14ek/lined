# AGENTS.md — Lined Web (`lined-web/`)

Instructions for AI coding agents (Claude Code, Codex, Gemini, etc.) working
on the Lined web application. Read this file before editing anything in
`lined-web/`.

## What this project is

Vite + React 19 + TypeScript (strict) web app for **Lined** — schedule sync &
task coordination for couples, families, and friends. It talks to the Spring
Boot backend in `backend/lined/` over REST with Bearer access tokens and the
cookie-backed refresh session.

Full monorepo context and the complete web conventions live in the root
[`../AGENTS.md`](../AGENTS.md) (section "Web — Vite + React"). This file is
the working entry point: task workflow first, then a condensed rule set.

**Before writing any code, read:**
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — the feature-folder
  structure, the shared-vs-feature-owned rule, the API `dev.ts`/`prod.ts`
  mock-switch pattern, and why the app is organized this way.
- [`docs/PROJECT_STRUCTURE.md`](docs/PROJECT_STRUCTURE.md) — the exact
  directory layout and naming conventions, so you put new files in the
  right place the first time.
- [`docs/TESTING.md`](docs/TESTING.md) — how and where to write tests,
  including the rule that every component/util file needs positive and
  negative coverage.

## UI task workflow (start here)

Feature work on this app is planned in **[`docs/UI_TASKS.md`](docs/UI_TASKS.md)**.
That file contains a table of tasks; each row links to a detailed spec in
`docs/tasks/UI-NN-*.md` with mockup references, development steps, expected
result, and the exact REST endpoints to use.

Rules for working the plan:

1. **One task per branch, one pull request per task.** Use exactly the branch
   name from the table (`feature/ui-NN-...`).
2. **Read the linked task file completely before writing code.** It lists
   development steps, dependencies on other tasks, and known backend gaps
   with their MVP workarounds — do not re-derive or contradict them.
3. **Respect task dependencies** noted in the task file (e.g. UI-06/07/08
   depend on UI-05). Pick a task whose dependencies are `DONE`.
4. **Update the Status column** in `docs/UI_TASKS.md` in the same PR:
   `TODO` → `IN PROGRESS` (when you start, commit early) → `DONE` (in the PR
   that completes it). If you stop midway, leave `IN PROGRESS` and add a
   short "Progress" note at the bottom of the task's md file describing what
   remains.
5. **Do not silently expand scope.** If the task needs something the backend
   doesn't provide, apply the workaround written in the task file and record
   the gap as a row in `backend/lined/docs/experiment-tasks.md` (Domain
   "Backend API gap") if it isn't already there.
6. **Verify against the mockup.** Serve `npx serve -p 4321 ../mockups/` and
   compare your result to the screen id named in the task file at 1280×800.

## Definition of done (every task)

All of the following must pass from `lined-web/` (Node 22 LTS — run
`nvm use` first):

```bash
npm run lint
npm run typecheck
npm run test:run
npm run build
```

Plus: new hooks/components have tests per [`docs/TESTING.md`](docs/TESTING.md)
(MSW v2 handlers seeded from each feature's `api/mockData.ts` +
`api/handlers.ts`), and the UI visually matches the mockup screen.

## Core conventions (condensed)

Full detail and rationale: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and
[`docs/PROJECT_STRUCTURE.md`](docs/PROJECT_STRUCTURE.md).

| Topic | Rule |
|---|---|
| Organization | Feature-first: `src/features/{feature}/` owns its `model/`, `api/`, `hooks/`, `lib/`, `pages/`, and components. Only truly domain-agnostic code lives in top-level `src/components/`, `src/hooks/`, `src/lib/` |
| Data fetching | Only via TanStack Query hooks in `features/{feature}/hooks/` (or shared `src/hooks/` for generic hooks) — never direct `ky` calls in components |
| API functions | Each feature's `api/prod.ts` (real requests) + `api/dev.ts` (mocks) + `api/index.ts` (picks one via `VITE_USE_MOCKS`); shared `ky` instance in `src/lib/apiClient.ts` |
| State split | Server data → TanStack Query; UI state → Zustand (`src/store/`); never mix |
| Types | DTOs/enums live in `features/{feature}/model/index.ts`, one feature per DTO; strict mode; no `any` |
| Styling | Tailwind v4 tokens only — no hard-coded hex values |
| Components | Never modify `src/components/ui/` (shadcn-owned); wrap it. Each shared component is its own `ComponentName/index.tsx` + `__tests__/` folder |
| Routing | React Router v7, all routes assembled in `src/router.tsx`; pages are `features/{feature}/pages/{Domain}Page.tsx` |
| Imports | Path alias `@/` → `src/`; cross-feature imports always via `@/features/{feature}/...` |
| Testing | Vitest + Testing Library; mock the network with MSW v2 — never mock `ky`. Every component/util needs positive + negative coverage — see `docs/TESTING.md` |
| Generated dirs | Never edit `dist/` |

## Key references

| What | Where |
|---|---|
| Architecture & feature-folder conventions | `docs/ARCHITECTURE.md` |
| Directory layout & naming | `docs/PROJECT_STRUCTURE.md` |
| Testing conventions | `docs/TESTING.md` |
| Task plan (work queue) | `docs/UI_TASKS.md` + `docs/tasks/UI-NN-*.md` |
| Mockups (design source of truth) | `../mockups/index.html` (15 screens; see `../mockups/AGENTS.md`) |
| Mockup → route/component map | `docs/mockups.md` |
| Backend API and DTOs | `backend/lined/` controllers/DTOs; endpoint summary in `docs/UI_TASKS.md` |
| Backend gap backlog | `../backend/lined/docs/experiment-tasks.md` |
| Full web conventions | `../AGENTS.md`, section "Web — Vite + React" |
