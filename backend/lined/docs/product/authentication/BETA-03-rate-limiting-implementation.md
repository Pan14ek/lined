# BETA-03 rate limiting implementation

This document records the implementation of the attached BETA-03 design for the
single-instance Beta deployment. The attached design remains the requirements
source; this document records the live repository decisions and operational
limits.

## Runtime behavior

Spring owns semantic authentication protection and Nginx owns coarse edge
volume protection. The backend uses Bucket4j 8.19.0 with a bounded Caffeine
cache. `RateLimitStore` is the replacement seam for a future shared atomic
store; Redis and horizontal scaling are deliberately outside this increment.

The application filter applies independent IP buckets to login, registration,
password-reset request and redemption, refresh, logout, and CSRF. The login
service applies the normalized/HMACed identifier bucket only after a failed
credential result and clears it after successful authentication. Password-reset
delivery consumes an identifier bucket before account lookup; exhaustion is an
internal suppression and still returns the existing indistinguishable `202`
response for known and unknown identifiers.

The refresh-session bucket is deferred. The current refresh contract performs
atomic rotation from the raw cookie and has no safe verified session lookup
before rotation. Adding a duplicate lookup would change the security and
transaction boundary. The mandatory refresh IP bucket remains in place.

## Policies

The defaults are configuration inputs, not production capacity claims:

| Policy | Capacity / interval | External behavior |
|---|---:|---|
| login IP | 30 / 5 minutes | 429 |
| failed login identifier | 10 / 15 minutes | 429 after failed attempts are exhausted |
| registration IP | 5 / hour | 429 |
| reset request IP | 10 / hour | 429 |
| reset delivery identifier | 3 / hour | generic 202 suppression |
| reset redemption IP | 10 / 15 minutes | 429 |
| refresh IP | 120 / 5 minutes | 429 without token mutation |
| logout IP | 120 / 5 minutes | independent 429; limiter capacity failure permits logout |
| CSRF IP | 300 / 5 minutes | 429 |

Admission rejection is `application/problem+json`, code
`rate_limit.exceeded`, `Cache-Control: no-store`, and a positive rounded
`Retry-After`. Mandatory limiter storage failure is generic `503` with
`rate_limit.unavailable`; it is not reported as 429. No identifier, IP, bucket,
remaining count, token, or precise reset time is returned.

## Trust, privacy, and deployment

Forwarding headers are accepted only when the direct peer matches the explicit
`lined.rate-limit.trusted-proxies` CIDR list. Nginx overwrites
`X-Forwarded-For` with the socket address instead of appending caller input.
Local Compose supplies a deterministic local-only HMAC secret and Docker proxy
CIDR. The host-published backend port is a local convenience; production must
keep the backend private and expose it only through a verified edge.

The local Nginx zones preserve application-generated 429 responses and add a
conditional one-second `Retry-After` only when Nginx itself rejects a request.
The Nginx rejection body is intentionally documented as an edge-specific
response until a deployed edge template can be validated as RFC 9457 JSON;
the browser parser relies on status and `Retry-After`, not response HTML.

`LINED_RATE_LIMIT_KEY_SECRET` is mandatory in enabled production deployments
and must be at least 32 characters. The local cache is capped by
`LINED_RATE_LIMIT_MAX_KEYS` and exhausted capacity fails closed for sensitive
admission. Expiration is write-based and configured longer than the longest
protective refill horizon. One serving backend replica is required; restart
resets local counters. A second replica requires a shared atomic store and a
separate rollout gate.

Metrics are low-cardinality: `lined.rate_limit.decisions` tagged only by
allowlisted policy and outcome, `lined.rate_limit.storage_failures` tagged by
failure kind, and cache entry/capacity gauges. Raw IP addresses, identifiers,
tokens, and reset links are not metric labels or log values.

## Web behavior

Ky does not automatically retry authentication POSTs or 429 responses. A typed
429 parser accepts bounded delta-seconds and HTTP-date `Retry-After` values.
Auth forms show a generic accessible message, disable submission for an
absolute-deadline countdown, and persist the deadline across remounts where
browser storage is available. Refresh 429/503/network errors preserve the
current access-token state; only a definite 401 invalid-session response clears
authentication. Reset-delivery `202` remains a neutral success state.

## Verification and remaining gates

Deterministic unit tests cover HMAC normalization, trusted proxy spoofing,
policy routing, burst/refill admission, bounded capacity, and concurrent
consumption. Existing backend tests and focused web tests cover the preserved
auth/reset contracts and refresh 429 behavior.

Still required before production launch: PostgreSQL/Testcontainers HTTP proofs
for every route, real-stack Playwright recovery scenarios, isolated k6/soak
evidence with measured resources, Nginx Compose smoke validation, operational
owner sign-off on starter limits, and fresh remote CI/Sonar results. This
branch does not claim DDoS protection, distributed correctness, CAPTCHA/WAF,
or empirically tuned capacity.
