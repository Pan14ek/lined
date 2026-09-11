# BETA-02 password-reset delivery

Password-reset requests keep the existing anti-enumeration contract: the API
returns `202 Accepted` with an empty body for both known and unknown
identifiers. A known account creates a 256-bit URL-safe token, persists only
its HMAC-SHA256 hash, and sends the raw token through the delivery port. The
token expires after `lined.auth.token-ttl` (30 minutes by default), is
single-use, and invalidates all other outstanding reset tokens and refresh
sessions after redemption.

## Local Mailpit

From `backend/lined/src/main/resources/database/`, start the disposable
development services:

```bash
docker compose up -d postgres-lineddb mailpit
```

Mailpit accepts SMTP on `localhost:1025` and exposes its inspection UI and API
on `http://localhost:8025`. Override `LINED_MAIL_SMTP_PORT` or
`LINED_MAIL_WEB_PORT` when those ports are occupied. Mailpit is development
infrastructure only and is not part of the production application image.

The BETA-01 launcher starts an isolated Mailpit container automatically and
sets `E2E_MAILPIT_API_URL`; Playwright retrieves reset messages from that API,
never through a production endpoint.

## Configuration

Local defaults target Mailpit:

| Property | Environment variable | Purpose |
|---|---|---|
| `lined.auth.mail.enabled` | `LINED_MAIL_ENABLED` | Enable outbound reset delivery |
| `lined.auth.mail.frontend-base-url` | `LINED_WEB_BASE_URL` | Trusted frontend origin used for reset links |
| `lined.auth.mail.host` / `port` | `LINED_MAIL_HOST` / `LINED_MAIL_PORT` | SMTP endpoint |
| `lined.auth.mail.username` / `password` | `LINED_MAIL_USERNAME` / `LINED_MAIL_PASSWORD` | SMTP credentials |
| `lined.auth.mail.from` | `LINED_MAIL_FROM` | Configured sender address |
| `lined.auth.mail.tls-enabled` | `LINED_MAIL_TLS_ENABLED` | STARTTLS setting |
| `lined.auth.token-ttl` | application property | Reset-token lifetime |

Production uses the `prod` profile. It requires a configured host, sender,
frontend URL, credentials, and HTTPS reset URL; missing values fail startup.
Set `LINED_WEB_BASE_URL` to the verified frontend origin and configure the SMTP
provider with a sender/domain that has passed provider verification. SPF, DKIM,
and DMARC are external DNS/provider prerequisites and are not represented by
application code.

Never commit SMTP credentials. Reset tokens, complete reset URLs, email
addresses, provider diagnostics, and credentials are not written to logs or
metric labels. A delivery failure is recorded with the low-cardinality
`lined.password_reset.delivery{outcome=failure}` counter while the public
request remains the generic `202` response; the persisted token can be
superseded by a later request.

## Verification

```bash
cd backend/lined
JAVA_HOME=$(/usr/libexec/java_home -v 21) ./gradlew test
JAVA_HOME=$(/usr/libexec/java_home -v 21) ./gradlew integrationTest

cd ../../lined-web
npm run e2e -- e2e/journeys/auth.spec.ts
```

Integration tests use the existing PostgreSQL Testcontainers setup and replace
the delivery port with a fake. The real-stack E2E journey uses the isolated
Mailpit SMTP/API container. If delivery fails locally, inspect Mailpit and the
configured host/port; do not enable token logging as a troubleshooting step.

The application deliberately does not add a token-retrieval endpoint, retry
loop, queue, or generic marketing-email subsystem. Rate limiting belongs to
BETA-03, standardized monitoring to BETA-05, support content to BETA-07, and
provider/DNS setup remains an external rollout prerequisite.
