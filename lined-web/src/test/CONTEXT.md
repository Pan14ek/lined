# CONTEXT.md — `src/test/`

## Purpose

Test infrastructure and cross-feature test fixtures — not feature tests
themselves. Every feature's actual tests live colocated in that feature's
own `__tests__/` folders; see `docs/TESTING.md`.

## Structure

```
test/
  setup.ts               Vitest global setup: starts/resets/stops the MSW
                         server around the whole run (beforeAll/afterEach/afterAll)
  server.ts               setupServer(...handlers) — MSW for Node/Vitest
  browser.ts               setupWorker(...handlers) — MSW for the live dev
                         server, started by src/main.tsx when VITE_ENABLE_MSW=true
  handlers/index.ts        aggregates every feature's api/handlers.ts into
                         one array, consumed by both server.ts and browser.ts
  utils.tsx                renderWithProviders (QueryClient + MemoryRouter
                         wrapper) + re-exports of screen/waitFor/userEvent —
                         the one entry point every component test imports from
  createMenuContent.ts     shared accessible-name/role/copy constants for
                         the "+ Create" menu, Create Lobby modal, and
                         lobby-type picker tests
  lobbyMemberContent.ts    shared accessible-name/role/test-id/copy constants
                         for the lobby Members tab and Add Member modal tests
  smoke.test.ts            sanity-checks the mock fixture data itself
                         (imports MOCK_USERS/MOCK_LOBBIES/etc. from each
                         feature's api/mockData.ts)
```

## Depends on

Every feature's `api/handlers.ts` (via `handlers/index.ts`) and
`api/mockData.ts` (via `smoke.test.ts`) — this is the one place in the app
that's expected to import from all ten features.

## Depended on by

Every test file in the app, indirectly: `setup.ts` runs automatically
(configured in `vitest.config.ts`'s `setupFiles`), and `utils.tsx` is the
standard import for `renderWithProviders`/`screen`/`waitFor`/`userEvent`.

## Testing

This folder *is* test infrastructure — `smoke.test.ts` is the only actual
test here, and it exists to catch a broken/missing fixture (e.g. a
`mockData.ts` file that no longer exports what a handler expects) before it
manifests as confusing failures elsewhere.

## Known gaps

- `handlers/index.ts` must be updated by hand whenever a new feature gains
  an `api/handlers.ts` — nothing auto-discovers feature handler files.
- The two mocking layers (MSW here, vs. each feature's `api/dev.ts` +
  `VITE_USE_MOCKS`) intentionally read from the *same* `mockData.ts` per
  feature but are otherwise independent — see
  `docs/ARCHITECTURE.md`, "The API layer".
