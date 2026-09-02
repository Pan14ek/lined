# Authentication Security SDD Tasks

The approved [system design](authentication-security-system-design.md) is decomposed below into dependency-ordered, one-PR slices. Each PR must preserve its requirement traceability, tests, documentation updates, and verification evidence.

## AUTH-SEC-01 Spring Security foundation

**Branch:** feature/auth-security-foundation. **Dependencies:** none.

**Traceability:** ADR-AUTH-001, 002, 022, 023, 026, 027; AUTH-FR-006, 020, 021; AUTH-SR-013; AUTH-NFR-001, 008; AUTH-AC-001, 021.

**Scope:** Add Boot-managed Spring Security resource-server dependencies, one stateless default-deny SecurityFilterChain, approved public routes, and Problem Details-compatible 401/403 handlers. Do not add a custom JWT filter.

**Verify and done:** MVC tests prove public routes work, unlisted routes are 401, and security errors are safe Problem Details. Update authentication/API error docs and run Gradle test, Checkstyle, SpotBugs, and diff check. Done when the standard security boundary protects private paths by default.

## AUTH-SEC-02 JWT access tokens

**Branch:** feature/auth-jwt-access-tokens. **Dependencies:** AUTH-SEC-01.

**Traceability:** ADR-AUTH-004, 006, 007, 008; AUTH-FR-003, 007; AUTH-SR-005, 006, 007; AUTH-NFR-003, 004; AUTH-AC-002, 003, 004, 024.

**Scope:** Externalize issuer, audience, HS256 key, 15-minute TTL, skew, and Clock. Implement framework JWT encoder/decoder with only sub, iss, aud, iat, exp, jti; validate signature, configured algorithm, issuer, audience, expiry, and numeric subject. Production fails without a valid secret.

**Verify and done:** Test claim shape, expiry, tampering, wrong algorithm/issuer/audience, and malformed subject. Update configuration docs. Done when only approved JWTs authenticate and no production default secret exists.

## AUTH-SEC-03 Spring credential authentication

**Branch:** feature/auth-credential-authentication. **Dependencies:** AUTH-SEC-01, AUTH-SEC-02.

**Traceability:** ADR-AUTH-003, 031; AUTH-FR-001, 002; AUTH-NFR-002, 006; AUTH-AC-026.

**Scope:** Add identifier-resolving Lined UserDetailsService, AuthenticationManager, and DaoAuthenticationProvider. Adapt login to use the authenticated Lined principal and JWT response. Unknown identifier and bad password return indistinguishable 401 failures.

**Verify and done:** Unit/MVC tests cover email/username success and generic credential errors; update API docs. Done when login uses framework primitives and credential verification remains separate from future OAuth issuance.

## AUTH-SEC-04 Auth-session persistence

**Branch:** feature/auth-session-persistence. **Dependencies:** AUTH-SEC-02, AUTH-SEC-03.

**Traceability:** ADR-AUTH-009, 010, 014, 018; AUTH-FR-004, 005, 015; AUTH-SR-003, 004, 009, 010; AUTH-NFR-003, 004, 007; AUTH-AC-008, 009, 010.

**Scope:** Add auth_sessions and auth_refresh_tokens schema/entities/repos with UTC fields, FKs, indexes, and token history. Generate 32 SecureRandom bytes as Base64URL, persist SHA-256 only, and create independent sessions with seven-day idle and 30-day absolute deadlines. Login sets the approved HttpOnly cookie via a web transport adapter.

**Verify and done:** Test hash/entropy, fixed-clock expiry, independent sessions, raw-token absence at rest, and cookie attributes; run PostgreSQL integration tests when Docker is available. Done when every login has a separately revocable hashed refresh session.

## AUTH-SEC-05 Refresh rotation and replay protection

**Branch:** feature/auth-refresh-rotation. **Dependencies:** AUTH-SEC-02, AUTH-SEC-04.

**Traceability:** ADR-AUTH-011, 012, 016; AUTH-FR-009 through 013; AUTH-SR-008, 009, 016; AUTH-NFR-003, 005; AUTH-AC-011 through 014.

**Scope:** Add public refresh endpoint, atomic consume-and-replace, successor linkage, idle expiry update, generic 401 response, and session-family revocation with safe telemetry after replay.

**Verify and done:** Fixed-clock and PostgreSQL concurrency tests prove one of simultaneous refreshes wins and the loser revokes the family. Done when a refresh credential has one successor at most and server deadlines are authoritative.

## AUTH-SEC-06 Current-session logout

**Branch:** feature/auth-current-session-logout. **Dependencies:** AUTH-SEC-04.

**Traceability:** ADR-AUTH-013, 014, 030; AUTH-FR-014, 015; AUTH-AC-015, 016.

**Scope:** Add idempotent logout that revokes the current refresh session/tokens and expires the cookie, but keeps other device sessions active. Document the accepted 15-minute residual access-JWT validity.

**Verify and done:** Integration tests prove current refresh fails after logout and another same-user session works. Done when logout is non-enumerating and current-session-only.

## AUTH-SEC-07 Trusted identity migration

**Branch:** feature/auth-trusted-identity-migration. **Dependencies:** AUTH-SEC-01, AUTH-SEC-02.

**Status:** Implemented in the backend and web client boundaries.

**Traceability:** ADR-AUTH-005, 019, 020, 021; AUTH-FR-006, 008; AUTH-SR-001, 002, 012; AUTH-AC-005, 006, 007.

**Scope:** Inventory all X-User-Id uses. Add CurrentUserProvider validating JWT subject without token parsing in domain code. Convert all caller-scoped operations, including users/me; delete headers, local backdoors, and obsolete examples. This does not redesign domain authorization.

**Verify and done:** Bearer regression tests prove valid identity works and supplied ID headers cannot impersonate; repository search leaves headers only in intentional regression assertions. Done when no production controller trusts client-controlled identity.

## AUTH-SEC-08 Web auth/session client

**Branch:** feature/web-auth-session-client. **Dependencies:** AUTH-SEC-05, AUTH-SEC-06, AUTH-SEC-07.

**Traceability:** ADR-AUTH-015, 016, 028, 029, 030; AUTH-FR-016 through 019; AUTH-SR-010, 011, 015; AUTH-AC-017 through 020.

**Status:** Implemented in `lined-web`.

**Scope:** In lined-web replace persisted user ID with memory-only access-token/bootstrap state. Attach Bearer token, remove ID header, bootstrap refresh then users/me, single-flight refresh/retry once, exclude auth/reset recursion, and clear user query/cache/Zustand data before redirect.

**Verify and done:** Vitest/MSW proves no persistence, bootstrap, one refresh for concurrent 401s, no retry loop, and no prior-user cache render. Run web test/lint/build. Done when browser identity never depends on persisted ID data.

## AUTH-SEC-09 Production exposure hardening

**Branch:** feature/auth-production-exposure-hardening. **Dependencies:** AUTH-SEC-01, AUTH-SEC-02, AUTH-SEC-05.

**Traceability:** ADR-AUTH-007, 016, 017, 024, 025; AUTH-SR-004, 005, 011, 014; AUTH-NFR-004, 005; AUTH-AC-010, 022, 023, 024.

**Scope:** Define external secrets, HTTPS cookie/CORS policy with explicit credentialed origins, production Swagger disablement, minimal public health, internal sensitive Actuator endpoints, and credential-redaction checks.

**Verify and done:** Profile tests cover missing secret failure, Swagger, Actuator, cookies, CORS, and logging. Done when production exposes no default secret, broad credentialed CORS, or sensitive operational endpoint.

## AUTH-SEC-10 Security verification and documentation

**Branch:** feature/auth-security-verification-documentation. **Dependencies:** AUTH-SEC-01 through AUTH-SEC-09.

**Traceability:** SDD sections 26 through 28; AUTH-AC-001 through AUTH-AC-026.

**Scope:** Complete backend/web evidence for login, validation, migration, refresh/replay, expiry, logout, multi-session, bootstrap, and cache isolation. Remove superseded paths only after proof. Reconcile contexts, API docs, operations docs, CI, non-goals, and residual logout trade-off.

**Verify and done:** Run Gradle test/check/coverage and integration tests when Docker is available; run web test/lint/build; inspect reports and diff check. Done when the SDD Definition of Done has repeatable evidence and runtime-faithful docs.

## Non-goals

OAuth, MFA, rate limiting, password policy, email verification, BOLA/IDOR audit, logout-all UI, immediate JWT denylist, and automated key rotation need separate specifications.
