# Web Authorization and Data-Exposure Security Audit System Design

**Project:** Lined  
**Area:** `lined-web` / frontend authorization UX / client-side data isolation / REST contract hardening  
**Recommended repository path:** `lined-web/docs/authorization-data-exposure-security-audit-system-design.md`  
**Status:** Implementation specification  
**Priority:** P0/P1 before public beta  
**Target stack:** React, TypeScript, Vite, TanStack Query, Zustand, ky, Vitest, React Testing Library, MSW

---

## 1. Purpose

This document defines the frontend security design and implementation plan that complements the backend BOLA/IDOR authorization work.

The backend remains the authoritative security boundary. The web client must never be treated as proof that a caller is authorized. However, the frontend still has important security and privacy responsibilities:

1. it must not expose data that the backend no longer intends to expose;
2. it must not keep data from a previous user session available in client caches;
3. it must not continue rendering protected data after access has been revoked;
4. it must distinguish authentication failures from object-authorization failures;
5. it must model owner/member/admin capabilities correctly for UX without pretending those checks are security enforcement;
6. its API models, mocks, caches, routes, and tests must match the hardened backend authorization contract;
7. it must not introduce client-side object-ID patterns that make unsafe API use easy or appear to authorize arbitrary target IDs.

This SDD is intentionally separate from the backend BOLA/IDOR SDD because the two layers solve different problems.

---

## 2. Relationship to the backend BOLA/IDOR SDD

This document depends on:

```text
backend/lined/docs/foundation/bola-idor-security-audit-system-design.md
```

The backend specification defines the authoritative rules for:

- caller identity;
- self/owner/member/creator/invitee/recipient/admin authorization;
- `401` / `403` / `404` semantics;
- object-level visibility;
- data minimization;
- nested parent-child validation;
- private-object non-enumeration;
- PostgreSQL-backed security integration tests.

This frontend specification defines how `lined-web` consumes those rules safely.

```text
BACKEND — authoritative security

Validated JWT subject
        ↓
CurrentUserProvider
        ↓
Domain AccessPolicy
        ↓
Authorization-aware REST response
        ↓

FRONTEND — authorization-aware UX

route visibility
component visibility
safe error state
DTO minimization
query-cache cleanup
session isolation
navigation behavior
```

The frontend must never turn this relationship around.

Wrong mental model:

```text
UI hid the button
    → backend assumes caller cannot invoke action
```

Direct REST calls through browser DevTools, curl, Postman, scripts, or modified clients must remain safe without the web application.

---

## 3. Core security principle

The frontend answers:

> What should this authenticated user be shown and allowed to attempt in the normal UI?

The backend answers:

> Is this exact request authorized?

A route guard, hidden button, disabled input, or client-side owner check is **UX authorization**, not security authorization.

Example:

```tsx
{isOwner && <DeleteLobbyButton />}
```

is desirable UX, but the backend must still independently enforce that the requester is the lobby owner.

---

## 4. Scope

The audit covers the current `lined-web` product surface and shared client infrastructure.

### 4.1 Authentication/session state

- `AuthBootstrap`;
- `RequireAuth` / `RedirectIfAuthed`;
- access-token storage;
- refresh failure;
- logout;
- account deletion;
- cross-account transitions;
- CSRF transport state;
- global Zustand stores;
- TanStack Query caches.

### 4.2 REST client surface

- user APIs;
- lobby APIs;
- invite APIs;
- task APIs;
- calendar/event APIs;
- notifications;
- billing/subscription caller-scoped APIs;
- future admin APIs.

### 4.3 Routing and navigation

- authenticated routes;
- direct URL navigation;
- lobby ID routes;
- future admin routes;
- unavailable object routes;
- role/permission-aware navigation.

### 4.4 Client-side data exposure

- TypeScript DTO models;
- cached responses;
- search result projections;
- account-only data;
- private event/task data;
- notification data;
- dev/mock fixtures;
- React Query Devtools;
- production mock flags.

### 4.5 Tests

- Vitest;
- React Testing Library;
- MSW network contract tests;
- feature API mock parity;
- cache/session isolation regression tests.

---

## 5. Non-goals

This SDD does **not** replace or duplicate:

- backend BOLA/IDOR enforcement;
- backend rate limiting;
- CSP/HSTS/security-header work;
- dependency vulnerability scanning;
- a full XSS audit;
- email verification;
- production infrastructure/secrets;
- legal/privacy pages;
- a new browser E2E framework if the project does not already use one.

The existing refresh-cookie/CSRF architecture should not be redesigned by this task except where needed to guarantee session cleanup.

---

## 6. Current Lined web baseline

The implementing agent must verify every baseline statement against the current branch before editing code.

### 6.1 Feature-first architecture

`lined-web` is organized by feature:

```text
src/features/{feature}/
  model/
  api/
  hooks/
  lib/
  pages/
  components...
```

Shared infrastructure remains under `src/lib`, `src/hooks`, `src/store`, `src/components`, and `src/test`.

This architecture must be preserved.

### 6.2 Current route boundary

The current router has public authentication/reset routes and a protected subtree under `RequireAuth`.

Current authenticated product routes include:

```text
/
/lobbies/:id
/lobbies/:id/settings
/calendar
/tasks
/settings
/subscription
```

There is not currently a general active admin route guard in the production route tree.

### 6.3 Access token storage is in memory

The current access token is stored in the Zustand auth store and is not persisted to `localStorage` or `sessionStorage`.

This is a good security baseline and must be preserved unless another approved design explicitly changes it.

### 6.4 Explicit session cleanup is strong

`clearClientAuthentication(queryClient)` currently clears:

- volatile auth transport state;
- TanStack Query cache;
- calendar user state;
- create-menu state;
- settings user state;
- auth state.

It is already used for explicit sign-out, account deletion, and bootstrap failure.

### 6.5 Runtime refresh failure is a separate path

The API client automatically attempts one refresh after a `401`.

If runtime refresh fails, authentication state is cleared in the low-level transport path, but that code does not have direct access to the QueryClient. Therefore the frontend must explicitly verify that the complete user-data cleanup invariant is also satisfied for this path.

### 6.6 Query cache is shared across subjects

Current query keys are subject-agnostic, for example:

```text
['users', 'me']
['users', id]
['lobbies', ...]
['tasks', ...]
```

This is acceptable only if all user-scoped cached data is reliably cleared when the authenticated account changes or the session becomes invalid.

### 6.7 Cache freshness can preserve old authorized responses

The global QueryClient currently uses a non-zero `staleTime` and does not refetch on window focus.

This is acceptable for performance but means cached data cannot be treated as permanent proof that authorization still exists.

### 6.8 Lobby pages already have an unavailable state

The current lobby route pages already render a not-found/unavailable state when the lobby query fails.

This is useful for the backend's hidden-object `404` contract.

### 6.9 Owner-only UI is already partially modeled

Current lobby settings calculate ownership from current server-returned user data and the lobby's owner ID. Owner-sensitive controls are already hidden in some places.

This is good UX and must remain explicitly non-authoritative.

---

## 7. Confirmed frontend findings to verify and address

These are starting findings, not permission to skip the full audit.

### FE-FIND-01 — runtime authentication loss may leave previous-account data cached

Explicit logout/account deletion/bootstrap failure clear the QueryClient, but failed automatic refresh during an already-running session follows a different path.

Important privacy scenario:

```text
User A authenticated
  → A's lobbies/tasks/events/users are cached
  → session is revoked or refresh expires
  → request gets 401
  → automatic refresh fails
  → auth status becomes unauthenticated
  → old query data remains unless a higher-level cleanup runs
  → User B signs in without full page reload
  → shared query keys may expose A's cached data
```

After this SDD, this must be impossible.

### FE-FIND-02 — normal self-service user hooks accept arbitrary user IDs

Current self-service flows expose generic client shapes such as:

```text
updateUser(id, data)
deleteUser(id)
useUpdateUser(id)
useDeleteAccount(id)
```

The backend must protect these regardless, but normal settings components should not be designed around arbitrary target-user mutation.

### FE-FIND-03 — user DTOs include privileged/unnecessary fields

Current frontend user models include full-account fields such as email and roles, and general search models also expect more fields than a public directory usually requires.

Normal create/update request types also contain role-like fields.

The hardened frontend should distinguish:

```text
current-account projection
public/directory user projection
admin role-management projection
```

### FE-FIND-04 — stale object cache after access revocation needs explicit handling

A user can lose access while the SPA remains open:

```text
member removed from lobby
invite cancelled
private item becomes inaccessible
admin permission removed
```

The backend may correctly respond with `403` or `404`, while old successful data remains in TanStack Query. The client must not continue rendering inaccessible protected data because it was previously cached.

### FE-FIND-05 — successful leave/delete flows may leave protected detail/dependent caches

Some lobby mutations invalidate list queries but do not necessarily purge every per-lobby detail and dependent query.

Self-leave and lobby deletion must remove the now-inaccessible data, not merely navigate away.

### FE-FIND-06 — dev/MSW behavior can diverge from production authorization

The frontend supports both:

```text
VITE_USE_MOCKS
VITE_ENABLE_MSW
```

If mocks return `200` where hardened production returns `403`/`404`, local UI behavior becomes misleading and security regression tests lose value.

### FE-FIND-07 — React Query Devtools are mounted in the application tree

The production behavior of development inspection tooling must be explicit. Developer tooling and mock infrastructure should be disabled/excluded from production.

---

## 8. Goals

### WEB-AUTHZ-G1 — backend remains authoritative

No frontend condition may be required for backend safety.

### WEB-AUTHZ-G2 — subject-isolated client state

Data cached for one account must never appear after a different account becomes active in the same SPA process.

### WEB-AUTHZ-G3 — access revocation removes sensitive UI state

If the backend says an object is no longer visible, the client must stop rendering and caching that protected representation.

### WEB-AUTHZ-G4 — minimal REST models

The frontend should model/render only fields intentionally returned for that use case.

### WEB-AUTHZ-G5 — safe direct navigation

Knowing a route ID must not cause the client to render a protected object without successful requester-authorized retrieval.

### WEB-AUTHZ-G6 — clear permission UX

Owner/admin-only controls should be hidden or disabled where the backend contract gives enough information to determine the normal UX capability.

### WEB-AUTHZ-G7 — correct `401` / `403` / `404` behavior

Authentication expiry, forbidden action, and hidden object must not be treated as the same state.

### WEB-AUTHZ-G8 — mock parity

MSW/dev APIs must preserve security-relevant semantics.

### WEB-AUTHZ-G9 — regression coverage

Security-sensitive client behavior must be covered by the existing frontend test stack.

---

## 9. Mandatory frontend security invariants

### WEB-INV-01 — UI authorization is never authoritative

Every owner/member/admin check in React is UX only.

### WEB-INV-02 — authentication and authorization failures are distinct

- `401` = authentication/session problem;
- `403` = authenticated caller lacks permission for this action;
- `404` = object missing or deliberately hidden.

A `403`/`404` for one resource must not globally sign the user out.

### WEB-INV-03 — failed session recovery clears all user-scoped state

If automatic token recovery fails, the same privacy cleanup guarantee as explicit logout applies.

At minimum:

```text
Query cache cleared
calendar user state reset
create-menu user state reset
settings user state reset
auth state cleared
volatile auth transport reset appropriately
```

### WEB-INV-04 — a new authenticated subject starts with a clean cache

No user-scoped query/store data from a previous account may survive into a new account session.

### WEB-INV-05 — hidden-object `404` purges inaccessible representation

When a protected detail fetch receives a security-significant `404`, any stale cached detail for that object must be removed and the UI must show a neutral unavailable state.

### WEB-INV-06 — action `403` keeps only legitimately visible context

A permission-denied action may show a controlled permission message, but it must not reveal additional protected state or leave an unauthorized optimistic mutation behind.

### WEB-INV-07 — URL IDs are identifiers only

A route such as `/lobbies/123` is not evidence of membership. The page must rely on the API response under the current session.

### WEB-INV-08 — normal self-service code should not expose arbitrary target-user mutation surfaces

Self-profile/settings code should use self-scoped hooks/functions. Admin target-user operations belong in a separate admin API surface.

### WEB-INV-09 — public user DTOs are data-minimized

General directory/member-display components must not require account-only fields.

### WEB-INV-10 — role/admin UX comes from trusted current-user server data

Do not infer admin rights from localStorage, query parameters, route names, editable local state, or another user's public DTO.

### WEB-INV-11 — privileged route guards fail closed

While current-user permission state is unknown/loading, privileged pages must not render.

### WEB-INV-12 — self-leave/delete purges inaccessible domain caches

After current-user leave or lobby deletion, remove lobby detail and related tasks/events/free slots/invites/preferences where applicable.

### WEB-INV-13 — mocks match production authorization semantics

A production `403`/`404` scenario must not be a mock `200` for convenience.

### WEB-INV-14 — production disables mock/debug surfaces

Production must not intentionally run with:

```text
VITE_USE_MOCKS=true
VITE_ENABLE_MSW=true
```

React Query Devtools should be development-only or otherwise proven absent/inert in production.

---

## 10. Target frontend architecture

The target stays feature-first and small.

```text
REST API
   ↓
src/lib/apiClient
   ├── normal authorized response
   │       ↓
   │   feature API/hooks
   │       ↓
   │   TanStack Query
   │       ↓
   │   page/component
   │       ├── UX capability checks
   │       └── safe 403/404 states
   │
   └── unrecoverable session failure
           ↓
       auth/session boundary
           ↓
       clear user-scoped state
           ↓
       RequireAuth -> sign-in
```

Do not introduce a large frontend ACL/ability framework.

Simple relationships should remain explicit, e.g.:

```ts
const isOwner = currentUser.id === lobby.ownerId;
```

For actual permission-based admin routes, a small reusable guard/helper is appropriate.

---

## 11. Session and cache isolation design

This is the highest-priority frontend security requirement.

### 11.1 Separate user-data cleanup from full auth teardown where useful

Conceptually split:

```ts
clearUserScopedClientState(queryClient)
clearClientAuthentication(queryClient)
```

Possible responsibilities:

```text
clearUserScopedClientState
  → queryClient.clear()
  → reset calendar store
  → reset create-menu store
  → reset settings/user-scoped stores
  → reset future user-specific client state

clearClientAuthentication
  → invalidate auth transport
  → clearUserScopedClientState
  → clear auth state
```

Exact names may differ if the repository evolves.

### 11.2 Runtime refresh failure must reach full cleanup

Low-level transport should not need React hooks. Use a clean higher-level mechanism such as:

- a top-level auth/session boundary observing authenticated → unauthenticated transition;
- a registered session-invalidated callback owned by the app layer;
- another simple design that guarantees the same invariant.

Do not create circular dependencies between `apiClient`, React hooks, and QueryClient.

### 11.3 Sign-in transition must clear old subject state

Conceptual sequence:

```text
login succeeds
   ↓
clear old user-scoped cache/stores
   ↓
activate new session/token
   ↓
load /users/me under new subject
   ↓
render authenticated routes
```

If activation occurs before cleanup, cleanup must not destroy the newly established token. The sequence must be deterministic and tested.

### 11.4 Query keys do not need a full subject-ID refactor

Do not rewrite every query key to include the current user unless a separate architectural need justifies it. Subject-agnostic keys are acceptable when session transition cleanup is guaranteed.

### 11.5 Audit all Zustand/browser state

Classify each stored value as:

```text
global preference safe across accounts
or
user-scoped data that must reset
```

Anything containing selected lobby IDs, drafts tied to a lobby/user, private filters, server-derived user data, etc. must reset on subject/session change unless deliberately account-independent.

---

## 12. Protected object cache invalidation design

### 12.1 Access revocation

Example:

```text
User is member of lobby 10
GET /lobbies/10 -> 200
cache contains lobby 10

owner removes user

later GET /lobbies/10 -> 404

frontend must:
  remove lobby detail cache
  remove dependent lobby data
  close protected overlays
  render neutral unavailable state
```

### 12.2 Shorter stale time is not the fix

Reducing `staleTime` may reduce the window but does not satisfy the security invariant. Cleanup must be driven by session/access events and authorization responses.

### 12.3 Feature-owned purge logic

Each feature should own its domain cache cleanup. Cross-feature query-key imports are already accepted by the architecture.

A focused helper such as:

```text
features/lobby/lib/cache.ts
  removeLobbyScopedQueries(queryClient, lobbyId)
```

is acceptable if it clarifies behavior.

### 12.4 Self-leave

If the current user leaves a lobby successfully, do not preserve the returned lobby as an accessible detail cache.

Instead:

```text
remove lobby detail
invalidate/remove my-lobbies
remove lobby tasks/events/free-slots/preferences
navigate away
```

### 12.5 Lobby deletion

On successful deletion:

```text
remove lobby detail immediately
remove lobby-scoped dependent queries
invalidate my-lobbies
navigate away
```

### 12.6 Removing another member

When an owner removes another member, the owner still has access. Normal successful lobby-detail update remains appropriate.

---

## 13. API error semantics in the web client

| Backend result | Frontend meaning | Frontend behavior |
|---|---|---|
| `401` before refresh | token/session may be stale | one automatic refresh attempt |
| refresh succeeds | session recovered | retry original request |
| refresh fails | session ended | clear user-scoped state; sign out; route to sign-in |
| `403` | caller knows context but action forbidden | keep legitimately visible context; show permission error |
| `404` on protected detail | missing or deliberately hidden | purge stale detail; show neutral unavailable state |
| `409` | authorized business/concurrency conflict | show conflict-specific UX |
| `428` | optimistic precondition missing | fix ETag/precondition flow; do not reinterpret as permission |

### 13.1 Hidden-object copy must be neutral

Good:

```text
This lobby is unavailable or no longer exists.
```

Bad:

```text
The lobby exists, but you are not a member.
```

### 13.2 `403` copy may be action-specific

For a known lobby member attempting an owner-only action:

```text
You don't have permission to change these lobby settings.
```

is appropriate.

### 13.3 Do not render raw protected-resource backend exception details

Map known statuses/codes to controlled UI copy.

---

## 14. Users API and data-minimization design

### 14.1 Separate current-account and public-directory models

Recommended conceptual shape:

```ts
interface CurrentUserDto {
  id: number;
  username: string;
  email: string;
  createdAt: string;
  roles?: string[];
  permissions?: string[];
  activePlan?: string | null;
  activeUntil?: string | null;
}

interface UserPublicDto {
  id: number;
  username: string;
  // future approved displayName/avatar only
}
```

Exact names must follow the final backend contract.

### 14.2 Search results must be minimal

General search/member selection should not require account-only fields such as roles, subscription state, account version, createdAt, or email unless a specific approved flow needs a field.

If invitations allow exact email input, send that email selector to the invite endpoint rather than exposing other users' email addresses through general directory results.

### 14.3 Remove role fields from normal user request types

Normal signup/profile update DTOs should not contain:

```ts
roles?: string[]
```

Admin role assignment uses a separate admin model/API.

### 14.4 Self-scoped settings hooks

Ordinary settings components should use shapes like:

```text
useUpdateCurrentUser()
useDeleteCurrentAccount()
```

If the backend still requires `/users/{id}`, the users feature may internally supply the current server-returned ID. Do not expose arbitrary target-ID mutation props to normal settings components.

If backend adds `/users/me` update/delete, adopt those endpoints.

### 14.5 Current-user cache consistency

After successful self-profile update, update/invalidate:

```text
QUERY_KEYS.currentUser
```

not merely a generic `QUERY_KEYS.user(id)` entry.

---

## 15. Lobby UI authorization design

### 15.1 Lobby detail route

```text
/lobbies/:id
```

Behavior:

```text
loading -> loading state
200     -> render lobby
404     -> purge stale lobby-scoped cache + neutral unavailable state
403     -> safe permission/unavailable handling without data leak
401     -> normal session recovery flow
```

### 15.2 Lobby settings route

The settings page may contain both member-level and owner-level operations. The entire page does not need to become owner-only if members legitimately manage their own notification preferences/leave action.

Owner-only sections/buttons remain conditional on current server-derived ownership.

### 15.3 Owner-only UX examples

Hide/disable for non-owner where applicable:

```text
rename/type mutation if owner-only
transfer ownership
delete lobby
remove another member
resend/cancel owner-managed invitations
restore/select-as-free if owner-only
```

### 15.4 Membership loss while open

On lost-access response:

```text
close lobby-scoped event/task overlays
remove lobby detail
remove lobby tasks/events/free-slots
remove lobby preference/admin data
navigate or render unavailable state
```

---

## 16. Invitations, tasks, events, notifications

### 16.1 Invitations

- owner-managed controls are shown only to known owner for UX;
- invitee actions are based only on caller-scoped invite data;
- invite `404` removes stale invite data and uses neutral copy;
- stale invite data must not continue exposing lobby/user details after denial.

### 16.2 Tasks

- lists render only requester-aware backend results;
- arbitrary `assigneeId` is never treated as proof of membership;
- hidden task `404` removes cached protected detail and closes edit/detail UI;
- mutation `403` rolls back/avoids unauthorized optimistic state;
- loss of lobby access purges lobby-scoped task caches.

### 16.3 Calendar/events

- private/inaccessible event `404` must not leave old title/location/details visible;
- event panels/modals close when the event becomes inaccessible;
- lobby access loss purges event/free-slot/conflict caches;
- mutation `403` must not leave unauthorized optimistic state.

### 16.4 Notifications

- inbox is caller-scoped and must be cleared on subject transition;
- mark-read `404` removes/refetches the stale notification;
- per-lobby notification preferences are purged when lobby access is lost.

---

## 17. Billing and future admin UI

### 17.1 Caller-scoped billing

Prefer APIs such as:

```text
GET /api/billing/me
```

Ordinary subscription UI should not provide arbitrary user IDs.

### 17.2 Admin route guard

When real protected admin APIs/routes exist, add a small guard such as `RequireAdmin` or `RequirePermission`.

It must:

1. wait for current-user permission data;
2. fail closed while loading/unknown;
3. show/navigate to unavailable state when permission absent;
4. never be documented as the authoritative security check.

### 17.3 Permission removal during session

If permission refetch removes access:

```text
purge admin-only query data
exit privileged route
hide admin navigation
```

---

## 18. Query retry and optimistic UI policy

### 18.1 Authorization-terminal responses

Recommended principle:

```text
401 -> transport refresh once
403 -> no blind automatic retry
404 -> no blind retry for direct protected object
5xx/network -> normal retry policy may apply
```

Do not globally disable useful retries without reviewing existing behavior.

### 18.2 Optimistic mutations

An unauthorized server denial must never leave local state in the unauthorized form.

For owner/admin/security-sensitive operations, server-confirmed transitions are preferred unless existing optimistic infrastructure has robust rollback.

A denied mutation must not leave fake:

```text
owner state
membership state
role state
private/shared state
```

---

## 19. Production build hardening

### 19.1 Mock flags

Production must use:

```text
VITE_USE_MOCKS=false
VITE_ENABLE_MSW=false
```

Prefer a build/startup guard that fails loudly if mock APIs are enabled in production mode.

### 19.2 React Query Devtools

Render developer inspection tooling only in development, e.g.:

```tsx
{import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
```

or use another build-proven exclusion.

### 19.3 Console logging

Audit for production logs containing:

```text
access tokens
reset tokens
full current-user DTOs
private task/event payloads
notification bodies
```

No such sensitive data should be intentionally logged.

---

## 20. Mock and fixture parity

Both `dev.ts` and MSW must follow the hardened backend contract.

### 20.1 Security response parity

Mocks should represent relevant cases:

```text
401 unauthenticated/session failure
403 known-context forbidden action
404 hidden/missing object
409 authorized conflict
```

### 20.2 DTO parity

If backend removes email/roles from public user search, remove them from:

```text
TypeScript models
mockData.ts
handlers.ts
dev.ts
fixtures/tests
```

Do not preserve privileged fields in mocks merely for convenient UI demos.

---

## 21. Frontend audit methodology

The agent must audit first and refactor second.

### Phase A — route inventory

Inspect:

```text
src/router.tsx
src/features/**/pages/*Page.tsx
layout/navigation components
```

For every route record:

| Route | Auth required | Object IDs | UX capability | Backend authority | Current error state |
|---|---|---|---|---|---|

### Phase B — API object-reference inventory

Inspect all:

```text
src/features/**/api/prod.ts
```

Record every path/query/body ID and classify it as:

```text
current subject
object target
relationship target
filter
admin target
```

Challenge any ordinary UI flow that sends the current subject ID unnecessarily.

### Phase C — DTO/data exposure inventory

Map each model to endpoint, consuming components, needed fields, and public/current-account/admin classification.

### Phase D — cache inventory

For each protected resource identify:

```text
query key
cache writes
mutation updates
403/404 cleanup
logout cleanup
account-change cleanup
```

### Phase E — UX authorization inventory

Search for:

```text
isOwner
role
ROLE_ADMIN
permission
member
ownerId
currentUser.id
```

Classify each as UX-only and verify corresponding backend enforcement exists.

### Phase F — regression tests then minimal remediation

Write/adjust tests for confirmed gaps and fix without unrelated redesign.

---

## 22. Test architecture

Use the existing stack:

```text
Vitest
React Testing Library
MSW
TanStack Query test clients
MemoryRouter
```

Frontend tests do not prove backend authorization. They prove that the client safely handles the backend authorization contract.

Prefer MSW for security contract tests because it exercises the real `prod.ts`/`ky` path.

---

## 23. Mandatory frontend regression scenarios

### 23.1 Session isolation

| Scenario | Expected |
|---|---|
| explicit logout | all user-scoped Query/Zustand data cleared |
| account deletion | same cleanup guarantee |
| bootstrap refresh failure | all user-scoped data cleared |
| runtime request -> `401` -> refresh failure | all user-scoped data cleared, not only token |
| User A cached -> session lost -> User B signs in | B never renders A's cached data |
| successful new sign-in | current-user query belongs only to new account |

### 23.2 Route guards

| Scenario | Expected |
|---|---|
| bootstrapping | protected content not rendered |
| unauthenticated | redirect to sign-in |
| authenticated | protected route rendered |
| privileged permission loading | privileged page not rendered |
| normal user on future admin route | unavailable; admin nav hidden |

### 23.3 Lobby detail/access revocation

| Scenario | Expected |
|---|---|
| authorized `200` | page renders |
| guessed/inaccessible `404` | neutral unavailable state |
| cached lobby then refetch `404` | stale lobby removed and not rendered |
| lobby `404` | old lobby name/member list absent |
| member owner-only mutation gets `403` | permission error; legitimately visible lobby remains |
| current user leaves | lobby + dependent caches purged |
| lobby deleted | lobby + dependent caches purged |

### 23.4 Users/data exposure

| Scenario | Expected |
|---|---|
| `/users/me` | full approved current-account fields |
| user search | only public approved fields |
| normal update model | no role assignment field |
| profile update | current-user query updated/invalidated |
| normal settings component | no arbitrary target user ID mutation API |

### 23.5 Invitations/tasks/events/notifications

| Scenario | Expected |
|---|---|
| invite action returns `404` | stale invite removed; neutral copy |
| task mutation returns `403` | no fake optimistic state |
| cached task later `404` | detail removed/closed |
| cached event later `404` | event panel closed; stale data removed |
| lobby access removed | task/event/free-slot caches removed |
| notification mark-read `404` | stale notification removed/refetched |
| session switch | old notification inbox absent |

### 23.6 Production configuration

| Scenario | Expected |
|---|---|
| production env | mocks disabled |
| production app | React Query Devtools not active |

---

## 24. No-sensitive-stale-data assertions

Security tests must assert not only navigation but absence of old protected content.

Examples:

```ts
expect(screen.queryByText('Private dinner')).not.toBeInTheDocument();
expect(screen.queryByText('Family Makieiev')).not.toBeInTheDocument();
expect(queryClient.getQueryData(oldLobbyKey)).toBeUndefined();
```

For cross-account tests, seed clearly identifiable User-A data and prove it is gone before User-B content renders.

---

## 25. Recommended code-level changes

The agent must confirm exact changes after audit.

### 25.1 Auth/session infrastructure

Likely files:

```text
src/features/auth/sessionCleanup.ts
src/features/auth/AuthBootstrap.tsx
src/features/auth/RequireAuth.tsx
src/lib/apiClient.ts
src/App.tsx
```

Expected outcome:

- one reliable cleanup invariant for explicit and implicit session loss;
- safe account transition cleanup;
- no circular dependency between low-level transport and QueryClient.

### 25.2 Users feature

Likely files:

```text
src/features/users/model/index.ts
src/features/users/api/prod.ts
src/features/users/api/dev.ts
src/features/users/api/handlers.ts
src/features/users/api/mockData.ts
src/features/users/hooks/useUsers.ts
src/features/users/hooks/useUserSettings.ts
src/features/users/lib/constants.ts
```

Expected outcome:

- separate self/public/admin DTOs;
- normal create/update models contain no role mutation;
- self-scoped settings API/hook;
- current-user cache stays consistent.

### 25.3 Lobby feature

Likely files:

```text
src/features/lobby/hooks/useLobbies.ts
src/features/lobby/lib/cache.ts        # optional focused helper
src/features/lobby/pages/LobbyPage.tsx
src/features/lobby/pages/LobbySettingsPage.tsx
src/features/lobby/settings/*
src/features/lobby/header/LobbyLoadStates.*
```

Expected outcome:

- owner/member UX matches backend;
- access-revocation cache purge;
- leave/delete cleanup.

### 25.4 Shared API errors

Potentially extend:

```text
src/lib/apiErrors.ts
```

with small helpers for authentication/forbidden/hidden-object status classification.

Do not duplicate domain authorization rules in shared helpers.

---

## 26. REST contract synchronization rules

When backend security contracts change, frontend production types, mocks, and components change together.

Example:

```text
backend public-user field removed
  → frontend type removed
  → dev mock removed
  → MSW fixture/handler removed
  → components stop rendering it
  → tests updated
```

And:

```text
backend outsider GET changes from 403 to 404
  → frontend unavailable-state behavior updated
  → MSW/dev.ts updated
  → tests updated
```

Do not retain obsolete privileged fields merely to avoid touching UI code.

---

## 27. SDD implementation plan

### WEB-AUTHZ-01 — Authorization/data inventory

**Goal:** map the current frontend before changing architecture.

Tasks:

1. enumerate routes;
2. enumerate API object IDs and target references;
3. identify current-subject IDs unnecessarily sent by normal UI;
4. inventory public vs account vs admin DTO fields;
5. inventory owner/member/admin UI conditions;
6. inventory protected query keys/cache updates;
7. map `401`/`403`/`404` behavior;
8. compare against final backend BOLA contract.

### WEB-AUTHZ-02 — Session and subject cache isolation

**Goal:** guarantee no cross-account data leakage.

Tasks:

1. establish full cleanup on runtime refresh/session failure;
2. guarantee new sign-in starts without previous-account state;
3. audit all Zustand stores;
4. preserve in-memory token design;
5. add User A → session loss → User B regression test.

### WEB-AUTHZ-03 — User API/data minimization

**Goal:** align user models with hardened backend projections.

Tasks:

1. split current-account/public-user models;
2. remove role fields from normal signup/profile DTOs;
3. adapt user search/member display;
4. self-scope settings hooks;
5. update `QUERY_KEYS.currentUser` correctly;
6. update MSW/dev fixtures/tests.

### WEB-AUTHZ-04 — Protected object error/cache behavior

**Goal:** stop rendering protected stale data after server denial.

Tasks:

1. define small status helpers;
2. lobby `404` → purge + unavailable state;
3. self-leave/delete → purge lobby-dependent caches;
4. task/event hidden `404` → close/purge detail;
5. invite/notification `404` → remove stale item;
6. `403` action failures → permission UX without logout;
7. ensure optimistic updates rollback.

### WEB-AUTHZ-05 — Privileged UX and production hardening

**Goal:** align owner/admin UX and production mode.

Tasks:

1. audit owner-only controls;
2. add privileged route guard only for real admin routes;
3. hide privileged nav when permission absent;
4. gate React Query Devtools to development;
5. enforce/verify production mock flags are off;
6. remove unsafe console logging if found.

### WEB-AUTHZ-06 — Regression suite and documentation

**Goal:** make the contract durable.

Tasks:

1. add/update MSW security scenarios;
2. update dev.ts parity;
3. add session/cache tests;
4. update affected feature `CONTEXT.md` files;
5. update architecture/testing docs if shared primitives change;
6. run full frontend quality gates;
7. document remaining backend dependencies.

---

## 28. Verification commands

Run from `lined-web/`:

```bash
npm ci
npm run lint
npm run typecheck
npm run test:run
npm run build
```

If package scripts change, use the current repository equivalents.

Because this SDD depends on backend REST changes, the combined implementation must also preserve the backend gates from the backend BOLA SDD.

---

## 29. Acceptance criteria

### Security boundary

- [ ] Frontend code/docs clearly treat backend authorization as authoritative.
- [ ] No owner/admin UI guard is relied upon for backend safety.

### Session isolation

- [ ] Explicit logout clears all user-scoped client data.
- [ ] Account deletion clears all user-scoped client data.
- [ ] Bootstrap failure clears all user-scoped client data.
- [ ] Runtime refresh/session failure clears all user-scoped client data.
- [ ] A second account cannot receive first-account cached data in the same SPA process.
- [ ] Access token remains in memory rather than persistent browser storage.

### User data

- [ ] `/users/me` uses the approved full current-account model.
- [ ] Public/directory user models contain only approved public fields.
- [ ] Normal signup/update DTOs cannot express role assignment.
- [ ] Normal settings hooks are self-scoped.
- [ ] Successful self-update keeps current-user cache consistent.

### Protected object revocation

- [ ] Lobby hidden `404` purges stale lobby detail.
- [ ] Current-user lobby leave purges lobby/dependent caches.
- [ ] Lobby deletion purges lobby/dependent caches.
- [ ] Hidden task/event responses do not leave stale private details rendered.
- [ ] Stale invite/notification `404` removes protected item data.
- [ ] `403` does not trigger global logout.

### UX authorization

- [ ] Owner-only lobby controls are hidden/disabled for non-owners where appropriate.
- [ ] Future admin routes fail closed while permission is unknown.
- [ ] Normal users do not see privileged admin navigation.
- [ ] Direct URL navigation is always backed by authorized API loading.

### Mocks/production

- [ ] MSW matches security-relevant backend `403`/`404` semantics.
- [ ] `dev.ts` does not grant access production would deny.
- [ ] Fixtures match hardened DTOs.
- [ ] Production mock modes are disabled.
- [ ] React Query Devtools are development-only/absent/inert in production.

### Tests

- [ ] Runtime session-loss cleanup has a regression test.
- [ ] User A → User B cross-account cache isolation has a regression test.
- [ ] Lobby stale-cache-on-404 has a regression test.
- [ ] Owner/member control visibility has tests.
- [ ] Public-user data minimization has tests.
- [ ] Protected task/event/invite/notification denial behavior is covered where those UIs cache protected details.
- [ ] `npm run lint` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm run test:run` passes.
- [ ] `npm run build` passes.

---

## 30. Definition of Done for each frontend security finding

A finding is complete only when:

```text
[ ] current behavior verified
[ ] backend authorization contract identified
[ ] frontend invariant documented
[ ] unsafe UI/cache/model behavior fixed
[ ] no backend rule duplicated as client authority
[ ] error behavior matches 401/403/404 semantics
[ ] stale sensitive data removed where applicable
[ ] MSW/dev mock behavior matches
[ ] regression test added
[ ] affected docs updated
[ ] frontend quality gates pass
```

---

## 31. Security review checklist for future frontend features

Every future Lined web feature should answer:

1. Does this route contain an object ID?
2. Does the page wait for an authorized backend response before rendering protected content?
3. Is any client condition being mistaken for a security boundary?
4. What happens when an object changes from `200` to `404` while cached?
5. What happens when a mutation returns `403`?
6. Does the feature purge data after current user loses access?
7. Can any cache survive an account switch and be interpreted as new-account data?
8. Does a DTO expose more fields than the component needs?
9. Does ordinary self-service UI accept an arbitrary target user ID unnecessarily?
10. Are admin/owner controls hidden for UX while still protected by backend?
11. Do MSW and `dev.ts` reproduce the same authorization semantics?
12. Are errors rendered using controlled messages rather than raw protected backend details?
13. Could an optimistic update leave unauthorized state after server rejection?
14. Is production guaranteed not to run mock/debug infrastructure?

If these questions cannot be answered from code and tests, the frontend feature is not public-beta ready.

---

## 32. Recommended implementation sequence with backend work

Ideal sequence:

```text
1. Backend BOLA-01 inventory
2. Frontend WEB-AUTHZ-01 inventory
3. Backend authorization contract/fixes
4. Frontend contract/model/cache adaptation
5. Backend PostgreSQL security regression tests
6. Frontend MSW/cache/session regression tests
7. Combined verification
```

The inventories can run in parallel. Frontend DTO/error-contract implementation should not finalize before backend semantics are settled.

---

## 33. Architecture after implementation

```text
+--------------------------------------------------+
| Browser                                          |
|                                                  |
| Auth/Session Boundary                            |
|  - in-memory access token                        |
|  - refresh                                       |
|  - complete cleanup on session loss              |
|                ↓                                 |
| TanStack Query + feature Zustand state           |
|  - subject-isolated through cleanup              |
|  - protected object purge on access loss         |
|                ↓                                 |
| Routes / Components                              |
|  - RequireAuth                                   |
|  - owner/admin UX                                |
|  - neutral hidden-object state                   |
|  - minimal DTO rendering                         |
+-------------------+------------------------------+
                    |
                    | Bearer JWT / REST
                    ↓
+--------------------------------------------------+
| Lined Backend                                    |
|                                                  |
| Spring Security                                  |
|      ↓                                           |
| CurrentUserProvider                              |
|      ↓                                           |
| Domain AccessPolicy                              |
|                                                  |
| AUTHORITATIVE SECURITY                           |
+--------------------------------------------------+
```

No frontend ACL engine is required.

No persistent access-token storage is required.

No obfuscated route IDs are required.

The key improvement is that the client becomes **authorization-aware without becoming the authorization authority**, and cached protected data is treated as revocable user-scoped data rather than permanent local truth.

---

## 34. Expected launch-readiness result

After this SDD and the backend BOLA/IDOR SDD are complete, Lined should be able to make the following frontend security/privacy claim:

> The web client does not rely on route guards or hidden controls as security enforcement. It consumes server-authorized, data-minimized contracts; clears all user-scoped state when an authenticated subject changes or a session is lost; removes protected cached representations when access is revoked; safely distinguishes authentication from authorization failures; and validates these behaviors with frontend regression tests aligned to the backend BOLA/IDOR contract.

This is the required `lined-web` authorization/data-exposure baseline before public beta.
