# Lobby Invitations

## Purpose and scope

Lobby invitations provide the controlled path for adding an existing user to a lobby. Owners create, list, resend, or cancel pending invitations; only the invitee can list, accept, or decline their own invitations.

## Architecture and participating classes

- [`LobbyInviteController`](../../../src/main/java/io/backend/lined/lobby/invite/api/LobbyInviteController.java) owns both nested-lobby and invitee-facing routes.
- [`LobbyInviteServiceImpl`](../../../src/main/java/io/backend/lined/lobby/invite/service/LobbyInviteServiceImpl.java) implements the `PENDING` → `ACCEPTED`, `DECLINED`, or `CANCELLED` lifecycle.
- [`LobbyInviteEntity`](../../../src/main/java/io/backend/lined/lobby/invite/domain/LobbyInviteEntity.java), [`LobbyInviteStatus`](../../../src/main/java/io/backend/lined/lobby/invite/domain/LobbyInviteStatus.java), and the repository persist and atomically transition invitations.
- Lobby access/write policies and `LimitEvaluator` supply ownership, read-only, and membership-limit checks.

## Interactions and data flow

The owner selects exactly one invitee by ID or email. The service prevents inviting a member or duplicating a pending invitation. Acceptance conditionally claims the pending row, adds the invitee to the lobby's members, and treats an already accepted retry as idempotent; a concurrent non-winning transition is reported as a conflict.

## API behavior and references

See the [lobby invitations API section](../../foundation/api.md#lobby-invites). The persistence strategy uses [JPA locking and versioning concepts](https://docs.spring.io/spring-data/jpa/reference/jpa/locking.html) together with a conditional update to make lifecycle transitions safe under concurrent requests.
