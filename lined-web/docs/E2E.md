# BETA-01 real-stack Playwright E2E

The BETA-01 suite runs Chromium against a production-like Vite build, the
real Spring Boot application, and an ephemeral PostgreSQL 16 container. It
does not enable MSW, `VITE_USE_MOCKS`, H2, fake authentication, or a test-only
HTTP endpoint.

## Prerequisites and one-command run

- Node.js 22 LTS (`.nvmrc`)
- JDK 21
- Docker, or a Docker-compatible runtime exposed through the Docker CLI
- Internet access on the first run for Gradle/npm packages and the PostgreSQL
  image

From `lined-web/`:

```bash
npm ci
npx playwright install chromium
npm run e2e
```

On macOS with multiple JDKs installed, select Java 21 for the command, for
example `JAVA_HOME=$(/usr/libexec/java_home -v 21) npm run e2e`.

Use `npm run e2e:headed`, `npm run e2e:ui`, and `npm run e2e:report` for
headed mode, Playwright UI mode, and the last HTML report respectively.

## Environment lifecycle and isolation

The launcher allocates random localhost ports, starts PostgreSQL with a unique
container name and no persistent volume, waits for `pg_isready`, starts the
backend with `bootRun`, waits for Actuator readiness, builds the frontend with
`VITE_ENABLE_MSW=false` and `VITE_USE_MOCKS=false`, starts Vite preview, waits
for `/sign-in`, and runs Playwright. Child processes and the container are
cleaned up on pass, failure, SIGINT, and SIGTERM. Readiness uses HTTP and
`pg_isready`, not fixed startup sleeps.

The launcher’s explicit E2E-only differences are:

- `SPRING_DATASOURCE_*` targets the ephemeral PostgreSQL container;
- `SERVER_PORT`, `VITE_API_BASE_URL`, and the CORS allowlist use allocated
  localhost ports;
- `LINED_SECURITY_REFRESH_COOKIE_SECURE=false` permits local HTTP; the
  normal `prod` profile still enforces secure refresh cookies;
- deterministic non-production JWT/reset secrets are supplied only to the
  backend child process;
- `FEATURE_FLAG_ENVIRONMENT=LOCAL` keeps the seeded capabilities enabled;
- `OTEL_SDK_DISABLED=true` avoids requiring an OTLP collector.

The launcher also starts an isolated Mailpit SMTP/API container. The test
environment exposes its API as `E2E_MAILPIT_API_URL`; password-reset tests
query that local API directly to retrieve the message and extract the reset
link. No production token-retrieval endpoint is used.

The existing backend Testcontainers configuration is the source for the
PostgreSQL 16 image choice, but it is JVM-bound and cannot host a long-lived
application process. The repository Compose file is not reused because it
binds a fixed host port/container name and persistent volume. The launcher
therefore reuses the image choice and normal backend/Flyway/Hibernate runtime
without creating another application artifact.

Set `E2E_CONTAINER_RUNTIME=podman` when `podman` is not available through a
Docker-compatible command. Rootless Podman must support `run`, `port`, `exec`,
and `rm`; Docker Desktop or a compatible socket is the supported CI path.

Each test creates unique `e2e_<run>-<journey>-<sequence>@example.test`
identities. Alice and Bob use separate browser contexts. The initial suite is
single-worker and does not share data between tests.

## Artifacts, CI, and adding journeys

On failure, artifacts are written under `e2e-artifacts/`: HTML report,
failure screenshots, traces on first retry, and retry videos. Inspect a trace
with:

```bash
npx playwright show-trace e2e-artifacts/test-results/<test>/trace.zip
```

The dedicated `playwright-e2e` GitHub Actions job installs Java/Node and
Chromium, runs the same launcher, uploads artifacts for 14 days, and leaves
the existing backend/frontend/Sonar gates unchanged.

Add a journey under `e2e/journeys/` and reuse the small public-flow helpers in
`e2e/helpers/product.ts`. Use roles, labels, and visible semantics; create a
fresh unique identity instead of depending on another test’s state.
`E2E-AUTH-05` covers the BETA-02 password-reset journey through Mailpit,
including generic unknown-email UX, successful new-password login, old-password
rejection, and one-time-link reuse rejection.

Common failures are a missing Docker-compatible runtime, unavailable JDK 21,
an absent Playwright browser, or backend readiness failing while Flyway
migrations/schema validation run. The launcher reports the first failing
process and always attempts cleanup.
