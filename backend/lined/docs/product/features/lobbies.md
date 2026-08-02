# Lobbies

## Purpose and scope

A lobby is the shared coordination space for a couple, family, friends, or work group. It owns members and is the parent context for tasks, events, invitations, and lobby-level notification preferences. The feature manages lifecycle, ownership, membership removal, writable state, and free-time discovery; invitation lifecycle is separate.

## Architecture and participating classes

- [`LobbyController`](../../../src/main/java/io/backend/lined/lobby/api/LobbyController.java) maps lobby HTTP operations to the service and attaches response ETags.
- [`LobbyServiceImpl`](../../../src/main/java/io/backend/lined/lobby/service/LobbyServiceImpl.java) creates, lists, restores, updates, deletes, and selects a Free-plan lobby.
- [`LobbyEntity`](../../../src/main/java/io/backend/lined/lobby/domain/LobbyEntity.java) and [`LobbyRepository`](../../../src/main/java/io/backend/lined/lobby/domain/LobbyRepository.java) model owner, members, lifecycle, and access mode.
- [`LobbyAccessPolicy`](../../../src/main/java/io/backend/lined/lobby/service/LobbyAccessPolicy.java) enforces owner/member access; [`LobbyWritePolicy`](../../../src/main/java/io/backend/lined/lobby/service/LobbyWritePolicy.java) rejects writes to restricted lobbies.

## Interactions and data flow

Creation makes the owner the first member and checks entitlements through `LimitEvaluator`. Tasks and events require a lobby and reuse its access/write policies; event scheduling supplies free-slot calculation. Billing can make a lobby read-only or archive it, while the owner may select one compliant Free lobby or restore an archived one when capacity allows.

## API behavior and references

Routes and representation fields are defined in the [lobbies API section](../../foundation/api.md#lobbies). See [Spring transaction management](https://docs.spring.io/spring-framework/reference/data-access/transaction.html) for why lifecycle and membership changes occur transactionally, and [RFC 9110 conditional requests](https://www.rfc-editor.org/rfc/rfc9110#section-13.1) for required mutable-resource preconditions.
