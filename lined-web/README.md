# Lined Web

Browser-based web application for **Lined** — *Where life and quality time meet.*

Built with Vite + React 19 + TypeScript.

---

## Requirements

| Tool | Version | Notes |
|------|---------|-------|
| **Node.js** | **22 LTS** | Pin with `.nvmrc` — run `nvm use` before working |
| npm | 10+ | Bundled with Node 22 |
| Git | Any recent | — |

> The backend (`backend/lined/`) must be running locally if you want live API calls.
> See the backend README for setup.

---

## Quick Start

```bash
# 1. Switch to the correct Node version
nvm use

# 2. Install dependencies
npm install

# 3. Copy the environment template and fill in values
cp .env.example .env.local

# 4. Start the development server
npm run dev
```

The app will open at **http://localhost:5173**.

---

## Environment Variables

All variables are prefixed with `VITE_` (required by Vite to expose them to
the browser bundle).

Create a `.env.local` file at the root of `lined-web/` (this file is
gitignored). A template is provided in `.env.example`.

| Variable | Default (dev) | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8080/api` | Base URL of the Spring Boot REST API |
| `VITE_ENABLE_MSW` | `true` | Starts an MSW service worker that intercepts `fetch`/`ky` calls with mock responses — lets the app run in the browser without a real backend. Used automatically in tests; optional in dev. |
| `VITE_USE_MOCKS` | `false` | When `true`, every feature's `api/index.ts` serves its in-memory `dev.ts` mock implementation instead of `prod.ts`, bypassing the network entirely. An alternative to `VITE_ENABLE_MSW` for local dev without a backend — don't enable both at once. |

Never commit `.env.local`. Never add secrets to `.env.example` (it is
committed and should only contain placeholder values).

---

## Available Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start Vite dev server with HMR on `http://localhost:5173` |
| `npm run build` | TypeScript check + production build → `dist/` |
| `npm run preview` | Serve the production build locally for manual testing |
| `npm test` | Run Vitest tests in watch mode |
| `npm run test:run` | Run tests once (useful in CI) |
| `npm run test:ui` | Open Vitest browser UI |
| `npm run test:coverage` | Generate coverage report → `coverage/` |
| `npm run lint` | ESLint check across `src/` |
| `npm run lint:fix` | ESLint with auto-fix |
| `npm run typecheck` | `tsc --noEmit` — type-check without building |

---

## Project Structure

The app is organized **feature-first**, not by technical layer: each
business domain owns its own DTOs, API functions, hooks, utilities, and
pages. Only truly domain-agnostic code lives at the top level of `src/`.
Full detail, naming conventions, and the reasoning behind this structure:
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and
[`docs/PROJECT_STRUCTURE.md`](docs/PROJECT_STRUCTURE.md).

```
lined-web/
├── public/                    # Static assets served as-is
├── src/
│   ├── features/               # One folder per business domain: auth,
│   │   └── {feature}/          # calendar, dashboard, layout, lobby,
│   │       ├── model/          # notifications, settings, subscription,
│   │       │   └── index.ts    # tasks, users
│   │       ├── api/
│   │       │   ├── prod.ts     # real ky requests
│   │       │   ├── dev.ts      # in-memory mocks, same exports as prod.ts
│   │       │   ├── index.ts    # picks dev/prod via VITE_USE_MOCKS
│   │       │   ├── mockData.ts
│   │       │   └── handlers.ts # MSW handlers for tests
│   │       ├── hooks/          # TanStack Query hooks built on ./api
│   │       ├── lib/            # domain utilities + QUERY_KEYS
│   │       ├── pages/          # route-level {Domain}Page.tsx components
│   │       └── ...             # UI components, grouped into topic
│   │                           # subfolders once a feature has several
│   ├── components/             # SHARED, domain-agnostic components only
│   │   ├── ui/                 # shadcn/ui primitives (DO NOT edit manually)
│   │   └── ComponentName/      # each shared component: index.tsx + __tests__/
│   ├── hooks/                  # SHARED, domain-agnostic hooks only
│   ├── lib/                    # SHARED infra: ky client, error helpers, cn()
│   ├── store/                  # Zustand stores for UI state
│   ├── test/                   # Test infrastructure
│   │   ├── handlers/index.ts   # aggregates each feature's api/handlers.ts
│   │   ├── server.ts           # MSW server setup (Node/tests)
│   │   ├── browser.ts          # MSW worker setup (live dev server)
│   │   └── utils.tsx           # renderWithProviders + test helpers
│   ├── router.tsx              # the only file that assembles the route tree
│   ├── App.tsx                 # Root component
│   └── main.tsx                # Entry point
├── docs/                       # Architecture, structure, and testing docs
├── .env.example                # Environment variable template
├── .nvmrc                      # Node version pin (22)
├── tailwind.config.ts          # Tailwind design tokens
├── vite.config.ts              # Vite configuration
├── vitest.config.ts            # Vitest configuration
└── tsconfig.json               # TypeScript configuration (strict mode)
```

---

## Architecture Notes

### Data Fetching

All server data is fetched through **TanStack Query** hooks in each
feature's `hooks/` folder (or shared `src/hooks/` for domain-agnostic
hooks). Components never call `ky` directly.

```
Component → hook (features/lobby/hooks/useLobbies.ts)
          → feature api (features/lobby/api/index.ts → prod.ts or dev.ts)
          → shared ky client (src/lib/apiClient.ts) → Spring Boot API
```

Each feature's `api/index.ts` picks `prod.ts` (real requests) or `dev.ts`
(in-memory mocks) based on `VITE_USE_MOCKS` — see
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md#the-api-layer-prodts--devts--indexts).

### State Management

- **Server/remote data** → TanStack Query cache
- **UI-only state** (open modals, selected tabs, filter values) → Zustand stores in `src/store/`

Do not put server data into Zustand. Do not put UI state into TanStack Query.

### API Authentication (MVP)

During the MVP phase the backend identifies callers via an `X-User-Id: <Long>`
HTTP header. The shared `ky` client in `src/lib/apiClient.ts` attaches this
header automatically from the auth store on every request.

When real authentication is added (JWT / session cookies), this interceptor
will be updated — all other code remains unchanged.

### Component Library

UI primitives come from **shadcn/ui** and live in `src/components/ui/`.
These files are generated by the shadcn CLI and must not be edited manually.

To add a new component:
```bash
npx shadcn@latest add <component-name>
```

To customise a primitive, wrap it in a component of your own instead of
editing the shadcn file — in `src/components/` if it's domain-agnostic, or
in the owning feature's folder if it isn't:

```tsx
// src/features/tasks/kanban/KanbanStatusBadge.tsx (or src/components/... for a shared one)
import { Badge } from '@/components/ui/badge';
import type { TaskStatus } from '@/features/tasks/model';

export const KanbanStatusBadge = ({ status }: { status: TaskStatus }) => {
  // custom logic here
  return <Badge variant={...}>{status}</Badge>;
};
```

Each shared component in `src/components/` lives in its own folder:
`ComponentName/index.tsx` + `ComponentName/__tests__/index.test.tsx`.

### Testing

API calls in tests are intercepted by **MSW v2**. Each feature registers its
mock responses in `features/{feature}/api/handlers.ts` (seeded from that
feature's `api/mockData.ts`); `src/test/handlers/index.ts` aggregates all of
them for the global MSW server started in `src/test/setup.ts`.

Every component and util file has a colocated `__tests__/` folder with
positive and negative coverage — see [`docs/TESTING.md`](docs/TESTING.md).

Never mock `ky`, `fetch`, or a feature's `api/` module directly in test
files — override an MSW handler with `server.use(...)` instead.

---

## Connecting to the Backend

1. Start the Spring Boot API: `./gradlew bootRun` (from `backend/lined/`)
2. Set `VITE_API_BASE_URL=http://localhost:8080/api` in `.env.local`
3. The backend requires CORS to allow `http://localhost:5173`.
   Add/verify `spring.web.cors.allowed-origins` in `application.yml`.

---

## Adding a shadcn Component

```bash
# From lined-web/
npx shadcn@latest add <component>

# Examples:
npx shadcn@latest add dialog
npx shadcn@latest add calendar
npx shadcn@latest add data-table
```

---

## Further Reading

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — the feature-folder
  structure, the shared-vs-feature-owned rule, and the API mock-switch
  pattern
- [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) — exact directory
  layout and naming conventions
- [docs/TESTING.md](docs/TESTING.md) — testing conventions
- [AGENTS.md](AGENTS.md) — agent instructions for this sub-project (task
  workflow, conventions)
- [CLAUDE.md](CLAUDE.md) — quick reference for Claude Code
- [../AGENTS.md](../AGENTS.md) — architectural rules for the whole monorepo
- [Vite docs](https://vitejs.dev/)
- [TanStack Query docs](https://tanstack.com/query/latest)
- [shadcn/ui docs](https://ui.shadcn.com/)
- [React Router v7 docs](https://reactrouter.com/)
