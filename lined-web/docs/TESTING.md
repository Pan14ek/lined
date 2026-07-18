# Testing

Stack: **Vitest** + **React Testing Library** + **MSW v2**. Run everything
from `lined-web/` (Node 22 LTS — `nvm use` first).

```bash
npm run test:run      # run once, CI mode
npm test              # watch mode
```

## Where tests live

Colocated with the code under test, in a `__tests__/` folder next to it —
never in a separate top-level test tree:

```
features/lobby/members/MemberCard.tsx
features/lobby/members/__tests__/MemberCard.test.tsx

components/EmptyState/index.tsx
components/EmptyState/__tests__/index.test.tsx

features/subscription/lib/subscriptionUtils.ts
features/subscription/lib/__tests__/subscriptionUtils.test.ts
```

`src/test/` itself is infrastructure, not feature tests: MSW server/browser
wiring (`server.ts`, `browser.ts`), the global setup file (`setup.ts`), and
small render/fixture helpers reused across many features' tests
(`utils.tsx`, `createMenuContent.ts`, `lobbyMemberContent.ts`).

## Every component and util file needs a test file

This is a hard rule, not a suggestion: **when you add a component or a
file that exports logic (a `lib/*.ts`, `*Utils.ts`, a hook), add its test
file in the same PR.** A file with zero tests is the default state to avoid,
not a follow-up. If a file is genuinely trivial (a pure re-export, a type
file with no runtime code), it doesn't need one — but "it's just a small
component" is not an exemption; small components are exactly what makes
positive/negative coverage cheap.

## Cover the positive and the negative

Every test file should include at minimum:

- **Positive**: renders/returns the expected result for typical, valid
  input.
- **Negative**: the failure/edge path — an error state, an empty list, an
  invalid or missing prop, a boundary value (zero, empty string, unmapped
  enum key). For pure functions, this usually means asserting what happens
  on the input that *isn't* the happy path (e.g. `cn()` dropping falsy
  values, `getErrorStatus()` returning `undefined` for a non-HTTP error).

Look at an existing test file in the same feature before writing a new one
— conventions (see below) should stay consistent within a feature.

## Rendering components: `renderWithProviders`

Use `renderWithProviders` from `@/test/utils` instead of RTL's `render`
directly — it wraps the component in a fresh `QueryClient` (retries off) and
a `MemoryRouter`:

```ts
import { renderWithProviders, screen, userEvent } from '@/test/utils';

renderWithProviders(<MyComponent />);
renderWithProviders(<MyComponent />, { initialEntries: ['/lobbies/3'] });
```

`screen`, `waitFor`, and `userEvent` are re-exported from the same module —
import them from there, not from `@testing-library/*` directly, so every
test file goes through one consistent entry point.

## Mocking the network: MSW, never `ky`

If a component/hook fetches data through a feature's `api/` module (which
resolves to `prod.ts` in tests, since `VITE_USE_MOCKS` is unset), intercept
the HTTP call with MSW — **never mock `ky` or a feature's `api/` module
directly**:

```ts
import { http, HttpResponse } from 'msw';
import { server } from '@/test/server';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

it('shows an error when the request fails', async () => {
  server.use(
    http.get(`${BASE}/tasks`, () => HttpResponse.json(null, { status: 500 })),
  );

  renderWithProviders(<KanbanBoard />);

  expect(await screen.findByText(/couldn't load/i)).toBeInTheDocument();
});
```

The default handlers (successful responses seeded from each feature's
`api/mockData.ts` and `api/handlers.ts`) are already registered globally in
`src/test/setup.ts` via `src/test/handlers/index.ts` — you only call
`server.use(...)` to override a handler for one test's error/edge case.

Presentational components that only take props (no internal data fetching)
don't need MSW at all — pass the props directly, as in the `SearchResultRow`
or `LobbyLoadStates` tests.

## Pure functions and constants

For `lib/` files with no React involved, plain Vitest `describe`/`it` with
direct function calls is enough — no `renderWithProviders`:

```ts
import { describe, it, expect } from 'vitest';
import { formatPlanPrice } from '../subscriptionUtils';

describe('formatPlanPrice', () => {
  it('formats a non-zero price with two decimals', () => {
    expect(formatPlanPrice(9.99)).toBe('$9.99');
  });

  it('labels a zero price as "Free"', () => {
    expect(formatPlanPrice(0)).toBe('Free');
  });
});
```

For a feature's `lib/constants.ts` (mostly lookup tables and `QUERY_KEYS`),
worthwhile assertions are: every enum value has an entry in every lookup map
(catches a missed case when a new enum value is added), `QUERY_KEYS` builders
produce distinct keys for distinct ids, and any real function (e.g.
`lobbyAccentColor`) gets normal positive/negative coverage.

## Style conventions

- One `expect.assertions(n)` at the top of each `it`, matching the number of
  `expect(...)` calls in the body — this catches a test that silently
  short-circuits (e.g. an `await` that never resolves) without failing.
- Use `vi.fn()` for callback props; assert `toHaveBeenCalledWith(...)` /
  `toHaveBeenCalledTimes(...)` rather than just "was called."
- Prefer role/label queries (`getByRole('button', { name: ... })`,
  `getByLabelText(...)`) over `getByTestId` or CSS selectors. Fall back to
  `data-testid` only for states with no accessible text (loading skeletons)
  — several components already expose one for exactly that
  (`data-testid="lobby-members-loading"` etc.); reuse the existing id rather
  than inventing a new query strategy.
- When a feature has many tests sharing the same accessible names/copy
  (roles, button labels, error strings), factor them into a shared content
  file like `src/test/lobbyMemberContent.ts` or `src/test/createMenuContent.ts`
  instead of repeating string literals across files — but don't create one
  for a single test file; inline literals are fine until a second file needs
  the same strings.

## Definition of done

Before opening a PR, from `lined-web/`:

```bash
npm run lint
npm run typecheck
npm run test:run
npm run build
```

All four must pass. New/changed hooks and components need tests per the
rules above.
