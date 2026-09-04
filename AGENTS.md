# AGENTS.md — Lined Monorepo

> This file tells AI coding agents how to work with the Lined codebase.
> Read it before making any changes. Keep it up to date when you introduce
> new conventions.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Repository Layout](#repository-layout)
3. [Backend — Spring Boot](#backend--spring-boot)
4. [Web — Vite + React](#web--vite--react)
5. [Mobile — React Native / Expo](#mobile--react-native--expo)
6. [Fitness Metrics Collector](#fitness-metrics-collector)
7. [Fitness Metrics Analyzer](#fitness-metrics-analyzer)
8. [Cross-Cutting Concerns](#cross-cutting-concerns)
9. [Common Agent Pitfalls](#common-agent-pitfalls)

---

## Project Overview

**Lined** is "Where life and quality time meet" — an app for couples,
families, and friends to synchronise schedules, coordinate tasks, and find
shared quality time together.

This is an early-stage product monorepo. The backend is the primary active
development surface. The web app (`lined-web/`) is the next product surface
being built. The mobile app is in its earliest scaffolding phase. Two
research/tooling sub-projects handle CI quality metrics.

This root file is the monorepo router. For backend implementation, backend
documentation, or scientific experiment work, read `backend/lined/AGENTS.md`
and the documentation index at `backend/lined/docs/README.md` before editing.

Scientific experiment work must be done iteratively. Use the task table in
`backend/lined/docs/experiment-tasks.md`, create one pull request per task, and
use the `experiment/` branch prefix for those PRs.

Web UI feature work is likewise task-driven. Read `lined-web/AGENTS.md` first,
then use the task table in `lined-web/docs/UI_TASKS.md` (each row links to a
detailed spec in `lined-web/docs/tasks/`), create one pull request per task,
and use the branch name given in the table (`feature/ui-NN-...`).

---

## Repository Layout

```
/
├── backend/lined/              # Spring Boot REST API (primary product backend)
├── lined-web/                  # Vite + React 19 web application
├── mobile/Lined/               # Expo + React Native mobile app
├── fitness-metrics-collector/  # Node.js CI tool — collects quality metrics
├── fitness-metrics-analyzer/   # Python research tool — analyses experiment data
└── .github/workflows/          # CI/CD pipelines
```

Each sub-project is self-contained with no shared build system at the root.
Navigate into the relevant directory before running commands.

---

## Backend — Spring Boot

**Location:** `backend/lined/`
**Stack:** Java 21, Spring Boot 3.5.6, Gradle 8.14.3, PostgreSQL 15

Backend-specific agent instructions live in `backend/lined/AGENTS.md`. Treat
that file as the source of truth for backend architecture, tests, quality
gates, documentation routing, and experiment preparation.

### Purpose

REST API that serves Lined clients (web and mobile). Manages users, lobbies
(shared group spaces), tasks, calendar events, plans, subscriptions, and roles.

### Prerequisites

- JDK 21 (Temurin or OpenJDK)
- PostgreSQL running on `localhost:5432`, database `lineddb`,
  credentials `postgres / postgres`
- The Gradle wrapper (`./gradlew`) handles all other tooling

### Build & Run Commands

```bash
# From backend/lined/

./gradlew build              # Compile + test + all quality checks
./gradlew bootRun            # Start API on port 8080
./gradlew test               # Unit tests only (H2 in-memory, no Postgres needed)
./gradlew check              # All quality checks: Checkstyle + SpotBugs + tests
./gradlew jacocoTestReport   # Generate JaCoCo HTML + XML coverage report
./gradlew checkstyleMain     # Checkstyle linting only
./gradlew spotbugsMain       # SpotBugs static analysis only
./gradlew sonarqube          # SonarCloud analysis (requires SONAR_TOKEN env var)
```

API docs (Swagger UI) are available at `http://localhost:8080/swagger-ui.html`
after starting the server.

### Testing

- Framework: JUnit 5 + Mockito + AssertJ
- Tests use H2 in-memory database via `application-test.properties`. Postgres
  is not required for running tests.
- Unit tests: `@ExtendWith(MockitoExtension.class)` with `@Mock` /
  `@InjectMocks`. Do **not** add `@SpringBootTest` to unit tests — keep them
  fast.
- Integration tests (where they exist): `@SpringBootTest`
- All new service behaviour must have a corresponding unit test.

### Package Structure

Root package: `io.backend.lined`

Every domain module follows an identical three-layer layout:

```
{module}/
  api/          # Controller, DTOs (Create/Update/Response), MapStruct mapper
  domain/       # JPA Entity, Repository, Enum(s)
  service/      # Service interface + ServiceImpl
```

Existing modules: `user`, `lobby`, `task`, `event`, `plan`, `subscription`,
`role`.

Special packages:
- `app/`    — Application-level orchestration (e.g. `AccountApplicationServiceImpl`)
- `common/` — Shared utilities: `EntityFinder`, exception hierarchy
- `config/` — Spring config: `GlobalExceptionHandler`, `OpenApiConfig`, `SecurityConfig`

### Architecture Rules

**Layer order is strict: Controller → Service → Repository → Entity.**
Cross-layer calls in the wrong direction are forbidden.

1. **Controllers** are thin. Accept/validate request, call one service method,
   return response DTO. No business logic in controllers.

2. **Service implementations** carry all business logic. Every `ServiceImpl`
   must be annotated `@Service`, `@RequiredArgsConstructor`, and
   `@Transactional` (use `jakarta.transaction.Transactional` — not the Spring
   one).

3. **Repositories** extend Spring Data JPA interfaces. No business logic here.
   Dynamic multi-field filtering uses `@Specification` (see `TaskServiceImpl`).

4. **Entities** use this exact Lombok combination:
   ```java
   @Getter @Setter
   @EqualsAndHashCode(onlyExplicitlyIncluded = true)
   @AllArgsConstructor @NoArgsConstructor @Builder
   @Entity @Table(name = "...")
   ```
   Annotate only `@Id` with `@EqualsAndHashCode.Include`. Never include
   mutable or collection fields in `equals`/`hashCode`. Use `FetchType.LAZY`
   on all associations.

5. **DTOs** are Java `record` types. Naming:
   - `{Domain}CreateDto` — POST body
   - `{Domain}UpdateDto` — PATCH body
   - `{Domain}Dto` — response payload

6. **MapStruct mappers**: `@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)`.
   Use explicit `@Mapping` for every non-trivial field.

### Entity Lookup Pattern

Always use `EntityFinder.findOrThrow()` from `io.backend.lined.common`:

```java
private TaskEntity mustTask(Long id) {
    return EntityFinder.findOrThrow(repo.findById(id),
        () -> new NotFoundException("Task %d not found".formatted(id)));
}
```

Never use raw `Optional.get()`. Never throw bare `NoSuchElementException`.

### Exception Hierarchy

```
RuntimeException
  └── BaseAppException(HttpStatus status, String code, String message)
        ├── NotFoundException  → 404
        └── ConflictException  → 409
```

`GlobalExceptionHandler` converts all exceptions to RFC 7807 `ProblemDetail`.
Do not add `@ResponseStatus` to exceptions — control HTTP codes through
`BaseAppException` subclasses only.

### Authentication

Protected backend endpoints require a valid `Authorization: Bearer <JWT>`
credential. Caller-scoped controllers resolve the positive numeric JWT subject
through the backend `CurrentUserProvider`; `X-User-Id` is not an identity
source. The web client uses the completed AUTH-SEC-08 in-memory
token/bootstrap/cache-isolation flow.

### Database Conventions

- All timestamp columns are `TIMESTAMPTZ` (UTC). Use `OffsetDateTime` in
  entities, never `LocalDateTime` for persisted timestamps.
- Schema managed via `src/main/resources/database/schema.sql` + JPA
  `ddl-auto=update`. No Flyway/Liquibase.
- Case-insensitive unique constraints use partial indexes
  (e.g. `LOWER(username)`). Mirror this for new unique text columns.
- Enum columns use `EnumType.STRING` — never `ORDINAL`.
- All associations use `FetchType.LAZY`.

### Code Style (Checkstyle)

Config: `config/checkstyle/checkstyle.xml`. Violations fail the build.

- 2-space indentation (no tabs)
- `UpperCamelCase` class names, `lowerCamelCase` method names, `UPPER_SNAKE_CASE` constants
- Always use braces for `if` / `for` / `while`
- No empty `catch` or `if` blocks
- Method length: max 50 lines
- Parameter count: max 7

Suppressions: `config/checkstyle/checkstyle-suppressions.xml`

### Static Analysis (SpotBugs)

Config: `config/spotbugs/spotbugs-exclude.xml`. Effort: `max`, level: `low`.

When suppressing a new pattern, add a targeted `<Match>` entry with a comment
explaining why. Never suppress an entire class without justification.

### Quality Gates — Do Not Break

| Gate | Tool | Constraint |
|------|------|------------|
| Zero new SpotBugs violations | SpotBugs | CI exits with code 2 if 0 classes detected |
| No Checkstyle violations | Checkstyle | `ignoreFailures = false` — build fails |
| Test coverage maintained | JaCoCo | Tracked by fitness function; do not delete tests |
| SonarCloud quality gate | SonarCloud | Project key `Pan14ek_lined` |

---

## Web — Vite + React

**Location:** `lined-web/`
**Stack:** Vite, React 19, TypeScript (strict), React Router v7, TanStack Query v5

### Purpose

Browser-based web application for Lined. This is the primary UI surface being
actively developed. See `lined-web/README.md` for setup instructions.

### Build & Run Commands

```bash
# From lined-web/

npm install          # Install dependencies (Node 22 LTS required)
npm run dev          # Dev server on http://localhost:5173
npm run build        # Production build to dist/
npm run preview      # Preview production build locally
npm test             # Vitest unit/component tests
npm run test:ui      # Vitest UI (browser-based test runner)
npm run test:coverage # Coverage report
npm run lint         # ESLint check
npm run lint:fix     # ESLint auto-fix
```

### Node Version

**Node.js 22 LTS.** Pinned in `.nvmrc`. Switch with `nvm use` before working
on this project.

### Project Structure

The app is organized **feature-first**, not by technical layer: each
business domain (`calendar`, `lobby`, `tasks`, `subscription`, `users`, ...)
owns its own DTOs, API functions, hooks, utilities, and pages under
`src/features/{feature}/`. Only truly domain-agnostic code lives at the top
level (`src/components/`, `src/hooks/`, `src/lib/`, `src/store/`, `src/test/`).

Full detail, the shared-vs-feature-owned rule, and the API mock-switch
pattern: **[`lined-web/docs/ARCHITECTURE.md`](lined-web/docs/ARCHITECTURE.md)**
and **[`lined-web/docs/PROJECT_STRUCTURE.md`](lined-web/docs/PROJECT_STRUCTURE.md)**.
Read those before adding a file to this project — they supersede any older
description of a flat `api/`/`hooks/`/`types/`/`components/` layout.

```
lined-web/src/
  features/{feature}/   # model/, api/ (prod.ts+dev.ts+index.ts), hooks/, lib/, pages/, UI
  components/           # SHARED, domain-agnostic components only (+ shadcn's components/ui/)
  hooks/                # SHARED, domain-agnostic hooks only
  lib/                  # SHARED infra: ky client, error helpers, cn()
  store/                # Zustand stores for UI state
  test/                 # Test infrastructure: MSW server/browser, render helpers
```

### Routing

React Router v7 with `createBrowserRouter`. All routes assembled in
`src/router.tsx`. Route components live in `features/{feature}/pages/`, named
`{Domain}Page.tsx` (e.g. `CalendarPage.tsx`, `TasksPage.tsx`).

### API Layer

The shared `ky` HTTP client lives in `src/lib/apiClient.ts`, configured with:
- `prefixUrl` set to `VITE_API_BASE_URL` environment variable
- `beforeRequest` hook is the client request boundary; AUTH-SEC-08 attaches
  the memory-only access Bearer token and contains no legacy identity-header
  generation

Each feature owns its own API surface under `features/{feature}/api/`:
`prod.ts` (real requests via the shared client), `dev.ts` (in-memory mocks,
same function signatures), and `index.ts` (picks one via `VITE_USE_MOCKS`).
See `lined-web/docs/ARCHITECTURE.md` for the full pattern, including why it
coexists with the separate MSW/`VITE_ENABLE_MSW` mocking layer used in tests.

TanStack Query hooks in each feature's `hooks/` (or shared `src/hooks/` for
generic hooks like `useDebouncedValue`) wrap these API functions. Hooks are
the only place components fetch data — no direct `ky` calls in component
files.

### State Management

- **Server state** (remote data): TanStack Query. Use `useQuery` for reads,
  `useMutation` for writes. Always invalidate related query keys after
  mutations. Cache keys live in each feature's `lib/constants.ts` as a
  `QUERY_KEYS` object.
- **UI state** (local only): Zustand. Use small, focused stores
  (e.g. `useCalendarStore` for view mode, selected date).
- Never put server data in Zustand. Never put UI state in TanStack Query cache.

### Component Library

`shadcn/ui` components are copied into `src/components/ui/`. When you need a
new primitive, add it via the shadcn CLI:

```bash
npx shadcn@latest add button
```

Do not modify files in `src/components/ui/` directly — they are owned by
shadcn. Create wrapper components in `src/components/` (if domain-agnostic)
or the owning feature's folder (if not) when you need customisation. Shared
components each live in their own `ComponentName/index.tsx` +
`ComponentName/__tests__/` folder.

All colours come from Tailwind CSS design tokens defined in `tailwind.config.ts`.
Never hard-code hex values in component files.

### TypeScript

Strict mode is on. No `any`. No `@ts-ignore` without a comment explaining why.
Path alias `@/` maps to `src/`. Use it for all internal imports.

### Testing

- **Test runner:** Vitest v3
- **Component tests:** `@testing-library/react` + `@testing-library/user-event`
- **DOM matchers:** `@testing-library/jest-dom`
- **API mocking:** MSW v2 — define handlers in `src/test/handlers/`; server
  setup in `src/test/server.ts`. Never mock `ky` directly in tests.
- **What to test:** All hooks, all non-trivial utilities, key user flows in
  page components.
- **What not to test:** shadcn/ui primitives, pure CSS, trivial presentational
  components with no logic.

Test file naming: `{Component}.test.tsx` co-located with the file under test,
or in `__tests__/` for directories.

### Environment Variables

All env vars are prefixed `VITE_` (required by Vite for client exposure).
Define in `.env.local` (gitignored). Template is in `.env.example`.

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Spring Boot API base URL (e.g. `http://localhost:8080/api`) |

---

## Mobile — React Native / Expo

**Location:** `mobile/Lined/`
**Stack:** Expo 54, React Native 0.81, TypeScript (strict), Expo Router v6

### Purpose

iOS/Android mobile app for Lined. Currently in early scaffolding — default
Expo template with theme infrastructure. No API integration yet.

### Build & Run Commands

```bash
# From mobile/Lined/

npm run start       # Expo dev server
npm run ios         # Open in iOS Simulator
npm run android     # Open on Android device/emulator
npm run web         # Open in browser
npm run lint        # ESLint check
```

### Navigation

Expo Router v6 file-based routing in `app/`. Tab screens live under
`app/(tabs)/`. Register new tabs with `<Tabs.Screen>` in
`app/(tabs)/_layout.tsx`.

Use Expo Router `Link`, `router.push()`, and `useRouter()` — do not use
React Navigation APIs directly.

### Component Conventions

- All text: `<ThemedText>` (not bare `<Text>`)
- All containers: `<ThemedView>` (not bare `<View>`)
- Icons: `<IconSymbol>` (SF Symbols on iOS, Material Icons fallback elsewhere)
- Animations: `react-native-reanimated` v4 — not the core `Animated` API
- Haptics: `expo-haptics` via `<HapticTab>`

### Styling

All colours from `constants/theme.ts` — never hard-code hex values.
Portrait orientation only.

### Current Limitations

No state management library, no API client, no tests. These will be added
when the mobile app enters active development. Do not scatter `fetch` calls
through components — wait for a central API layer.

---

## Fitness Metrics Collector

**Location:** `fitness-metrics-collector/`
**Stack:** TypeScript, Node.js 20, Azure Cosmos DB SDK

### Purpose

CI/CD-only tool. Runs in GitHub Actions after the backend build. Reads XML
quality reports (Checkstyle, SpotBugs, JaCoCo), fetches SonarCloud metrics,
computes a composite fitness function score, and writes results to Azure
Cosmos DB. **Not part of the product.**

### Build & Run

```bash
# From fitness-metrics-collector/

npm ci               # Install exact dependencies
npm run build        # tsc compile → dist/
npm run metrics      # build + run
```

### Required Environment Variables

| Variable | Purpose |
|---|---|
| `COSMOS_DB_CONNECTION_STRING` | Azure Cosmos DB connection |
| `SONAR_TOKEN` | SonarCloud API token |
| `BRANCH_NAME` | Current branch name |
| `PR_NUMBER` | Pull request number (if applicable) |
| `GITHUB_SHA` | Commit hash |
| `CHECKSTYLE_XML` | Path to Checkstyle XML report |
| `SPOTBUGS_XML` | Path to SpotBugs XML report |
| `SPOTBUGS_HTML` | Path to SpotBugs HTML report |
| `JACOCO_XML` | Path to JaCoCo XML report |

### Fitness Function

```
F = 0.25 × normalize(spotbugs_total)           [lower is better]
  + 0.25 × normalize(critical_violations)       [lower is better]
  + 0.30 × normalize(jacoco_line_coverage)      [higher is better]
  + 0.07 × normalize(code_smells)               [lower is better]
  + 0.07 × normalize(duplicated_lines_density)  [lower is better]
  + 0.06 × normalize(checkstyle_violations)     [lower is better]
```

Result range: `[-1, 1]`. Computed relative to the latest `main` branch
snapshot in Cosmos DB.

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 2 | SpotBugs invalid — 0 classes detected (build artefact missing) |

---

## Fitness Metrics Analyzer

**Location:** `fitness-metrics-analyzer/`
**Stack:** Python 3, pandas, matplotlib, scipy, azure-cosmos

### Purpose

Standalone research/academic analysis tool. Processes experiment data from
Cosmos DB and generates charts and CSV statistics for a research paper on CI
quality metrics. **Not deployed. Not part of the product build or CI.**

### Run

```bash
# From fitness-metrics-analyzer/

pip install -r requirements.txt    # First time only

python3 main.py                    # All charts → ./output/
python3 main.py --chart bar        # Specific chart only
```

Requires `COSMOS_DB_CONNECTION_STRING` environment variable.

### Experiment Branch Naming

The analyzer categorises experiments by branch prefix:
- `experiment/improve-*` — interventions expected to raise the F score
- `experiment/degrade-*` — interventions expected to lower the F score
- `experiment/neutral-*` — control interventions

---

## Cross-Cutting Concerns

### CI/CD Pipeline

Workflow: `.github/workflows/ci-backend.yml`

Stages (in order):
1. Checkout (full history for SonarCloud blame data)
2. JDK 21 (Temurin) setup
3. Gradle cache restore
4. `./gradlew check` — Checkstyle + SpotBugs + tests
5. `./gradlew jacocoTestReport` — coverage
6. `./gradlew sonarqube` — SonarCloud analysis
7. Upload build reports as GitHub Actions artifacts (14-day retention)
8. Upload SpotBugs SARIF to GitHub Security tab
9. Reviewdog Checkstyle annotations on PR diffs (PR runs only)
10. `npm ci && npm run metrics` in `fitness-metrics-collector/` — persist F score

**Required GitHub secrets:** `SONAR_TOKEN`, `COSMOS_DB_CONNECTION_STRING`

### SonarCloud

Project: `Pan14ek_lined`, organisation: `pan14ek`. Runs on every PR and push
to `main`. Check the dashboard before merging if the quality gate is red.

### Secrets

Never commit `COSMOS_DB_CONNECTION_STRING`, `SONAR_TOKEN`, database passwords,
or any credentials. These belong in GitHub Actions secrets and local `.env`
files (gitignored).

---

## Common Agent Pitfalls

### Backend

1. **Wrong `@Transactional` import.** Use `jakarta.transaction.Transactional`,
   not `org.springframework.transaction.annotation.Transactional`.

2. **Using `Optional.get()` directly.** Always use `EntityFinder.findOrThrow()`
   or a private `must*()` helper. Bare `.get()` throws `NoSuchElementException`
   which `GlobalExceptionHandler` does not map.

3. **Throwing raw exceptions.** "Not found" → `NotFoundException`. Conflicts →
   `ConflictException`. Both are mapped to RFC 7807 responses automatically.

4. **Forgetting `ReportingPolicy.ERROR` on new MapStruct mappers.** Unmapped
   fields silently remain null at runtime. Add explicit `@Mapping` for every
   field that doesn't map by name.

5. **Changing `FetchType.LAZY` to `EAGER`.** Never do this. It causes N+1
   queries and breaks SpotBugs suppression assumptions.

6. **Breaking entity `equals`/`hashCode`.** Only `@Id` is included. Do not add
   other fields — this breaks JPA set semantics.

7. **Method longer than 50 lines.** Checkstyle enforces a 50-line limit. Extract
   private helpers.

8. **Using `LocalDateTime` for persisted timestamps.** Use `OffsetDateTime`.

9. **Skipping the `api/domain/service/` structure in a new module.** The
   three-package layout is mandatory.

10. **Bypassing the trusted identity adapter.** Protected routes are secured by
    Spring Security and caller-scoped controllers must use
    `CurrentUserProvider.requireUserId()`; never restore `X-User-Id` identity
    handling. The web client migration is delivered by AUTH-SEC-08.

### Web App

11. **Calling `ky` directly in components.** All data fetching goes through
    TanStack Query hooks in each feature's `hooks/` (or shared `src/hooks/`
    for domain-agnostic hooks). Components only call hooks.

12. **Putting server data in Zustand.** Zustand is for UI state only. Remote
    data lives in TanStack Query cache.

13. **Forgetting to invalidate query keys after mutations.** After any write
    operation, call `queryClient.invalidateQueries({ queryKey: [...] })` to
    keep the UI in sync.

14. **Hard-coding colours.** All colours come from Tailwind tokens in
    `tailwind.config.ts`. Never use raw hex values in component files.

15. **Modifying files in `src/components/ui/`.** These are owned by shadcn.
    Create wrapper components in `src/components/` instead.

16. **Mocking `ky` directly in tests.** Use MSW v2 handlers in
    `src/test/handlers/`. This tests the full request/response cycle.

### Mobile

17. **Using bare `<Text>` or `<View>`.** Always use `<ThemedText>` and
    `<ThemedView>` for dark mode support.

18. **Hard-coding colours in mobile.** All colours from `constants/theme.ts`.

19. **Using React Native core `Animated` API for new animations.** Use
    `react-native-reanimated` v4.

20. **Creating new tabs without registering them in the layout.** Add a
    `<Tabs.Screen>` entry in `app/(tabs)/_layout.tsx`.

### Fitness Metrics Collector

21. **Running `npm run metrics` without backend build artefacts.** Run
    `./gradlew check && ./gradlew jacocoTestReport` in the backend first. The
    script reads from `../backend/lined/build/reports/`.

22. **Changing the Cosmos DB document schema without updating the `Metrics`
    type.** The Python analyzer reads the same document shape — a schema
    change breaks both.

### General

23. **Editing generated directories** (`fitness-metrics-collector/dist/`,
    `mobile/Lined/.expo/`, `lined-web/dist/`). Always edit source files.

24. **Changing the fitness function weights without updating this file.**
    Weights are also documented in the research paper. Changes must be
    intentional and tracked here.
