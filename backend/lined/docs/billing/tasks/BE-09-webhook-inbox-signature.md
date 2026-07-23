# Task BE-09 — Webhook Inbox + Signature Verification

**Branch:** `feature/be-09-webhook-inbox-signature`

*Depends on BE-07 (ports), BE-08 (sandbox for tests). Blocks BE-11
(subscription activation reads from the inbox), BE-13 (refund events),
BE-15 (reconciliation retries failed events).*

## Detailed description

Ship the `billing_provider_events` inbox and the webhook endpoint that
verifies provider signatures, deduplicates, and hands off to an
asynchronous processor. HTTP response returns as soon as the inbox row
is durable — business processing happens in a scheduled processor so
the endpoint stays within provider timeouts.

Scope:

1. New table `billing_provider_events` per design §12.9 with unique
   constraint `(provider, provider_event_id)` and status enum
   `RECEIVED|PROCESSING|PROCESSED|FAILED|IGNORED`.
2. `WebhookController` under `billing/api/webhook/`:
   - `POST /api/billing/webhooks/{provider}` where `{provider}` matches
     a configured adapter qualifier
   - reads the raw request body (preserves bytes for signature
     verification) via `@RequestBody byte[]` + a `HandlerInterceptor` /
     `RequestBodyAdvice` if needed
   - hard 1 MiB size limit — larger requests return 413
   - no `X-User-Id` — this endpoint has no user identity
3. `ProviderWebhookRouter` looks up the adapter via
   `BillingCheckoutProvider`/`BillingSubscriptionProvider` port
   (extension: add a `verifySignature(byte[] body, HttpHeaders headers)`
   method to a new `BillingWebhookVerifier` port and update BE-07's port
   list — see BE-07 follow-up).
4. Invalid signature → 401, log a `billing_webhook_invalid_signature`
   security event (metric added in BE-15), do NOT insert into inbox.
5. Valid signature → insert into `billing_provider_events` with
   `processing_status=RECEIVED`; return 200. On unique-constraint
   violation (duplicate `provider_event_id`), still return 200 (idempotent).
6. `WebhookProcessor` — scheduled job that picks up `RECEIVED` events
   ordered by `occurred_at ASC`, marks `PROCESSING`, dispatches to a
   `ProviderEventHandler` per event type, and marks `PROCESSED` /
   `FAILED` (with retry count + `last_error`).
7. Out-of-order protection: before applying a state-changing event,
   compare event's `occurred_at` with the target
   `SubscriptionEntity.providerUpdatedAt`; if older, mark `IGNORED`
   (design §22.3).
8. This task ships **no** event handlers — those live in BE-11
   (subscription lifecycle) and BE-13 (refund). The dispatcher looks up
   handlers by event type via a `Map<String, ProviderEventHandler>`
   populated by Spring, defaulting to `IgnoreUnknownEventHandler` that
   marks the event `IGNORED` with reason "no handler".

## Design references

- §12.9 `billing_provider_events`
- §22 Webhook Processing
- §22.3 Out-of-order events
- §22.4 Webhook acknowledgement
- §41.4 Webhook security
- §42.4 Webhook deduplication
- §43 Transaction Boundaries

## Idea of this task

Webhooks are the primary real-time synchronization mechanism. Getting
the receive → verify → dedupe → durable-insert → async-process pipeline
right — with signature verification, size limit, and out-of-order guard
— means every business handler (BE-11, BE-13) can assume it is only
called for valid, deduplicated, in-order events.

## Development steps

1. Add `BillingWebhookVerifier` port to `billing.port` (extending
   BE-07's set) with `verifySignature(byte[] body, Map<String,String>
   headers) → boolean` and the sandbox adapter always returns `true` in
   dev/test but has a lightweight HMAC path for
   `SandboxProviderContractTest` to exercise.
2. Append `billing_provider_events` DDL to `schema.sql`.
3. Add entity + repository under `billing/domain/event/`.
4. Add `WebhookController` + `ProviderWebhookRouter` under
   `billing/api/webhook/`.
5. Add `WebhookProcessor` scheduled component
   (`@Scheduled(fixedDelayString="${billing.webhook.processor.delayMs:5000}")`),
   dispatch map, `IgnoreUnknownEventHandler`.
6. Add `ProviderEventHandler` interface: `handle(ProviderEvent event) →
   ProviderEventOutcome`.
7. Configure raw-body preservation for the webhook path only (don't
   change the app-wide message converters).
8. Tests.
9. Run `./gradlew test checkstyleMain spotbugsMain`.

## Final / expected result

- `POST /api/billing/webhooks/sandbox` accepts a signed request and
  returns 200; the row lands in `billing_provider_events`.
- Duplicate delivery of the same `provider_event_id` returns 200 and
  does not insert a second row.
- Invalid signature returns 401 and no inbox row is created.
- Async processor picks up the row within one delay interval and
  dispatches to a handler; unknown event types are `IGNORED`.
- Out-of-order events (older than the target subscription's
  `provider_updated_at`) are `IGNORED`.
- `./gradlew test`, `./gradlew checkstyleMain`, `./gradlew spotbugsMain`
  pass.

## REST API added / changed

| Purpose | Method + Path |
|---|---|
| Provider webhook | `POST /api/billing/webhooks/{provider}` (raw body, provider signature) |

## Tests to add

- **Controller — `WebhookControllerSignatureTest`**: 401 when signature
  fails; 200 when it succeeds; 200 on duplicate delivery; 413 on
  oversized body.
- **Integration — `WebhookProcessorIT`** (Testcontainers +
  `@Scheduled` invoked directly): row lands, transitions
  RECEIVED→PROCESSING→PROCESSED via a test-only handler; failure
  marks FAILED and increments `attempt_count`.
- **Integration — `WebhookOutOfOrderIT`**: seeded subscription with
  `providerUpdatedAt=T2`; event with `occurredAt=T1` is marked
  IGNORED, subscription untouched.
- **Integration — `WebhookDeduplicationIT`**: 100 concurrent inserts
  of the same event ID → exactly one row.
- **Security — `WebhookNoAuthHeaderTest`**: endpoint does not read or
  require `X-User-Id`; a stray one is ignored.

## Risk & follow-ups

- Raw body preservation can conflict with global `@RequestBody`
  message converters — restrict the interceptor to
  `/api/billing/webhooks/**` paths.
- The scheduled processor runs single-threaded by default. If webhook
  volume grows, BE-15 can move it to a bounded thread pool.
- `SandboxProviderContractTest` should include an HMAC-verify path so
  the sandbox exercises the signature contract too, not only ports.
