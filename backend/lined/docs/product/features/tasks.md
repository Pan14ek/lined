# Tasks

## Purpose and scope

Tasks coordinate work inside a lobby: title, description, assignee, due date, priority, status, and visibility. A task can be shared with lobby members or private to its creator; the feature does not expose another user's private work.

## Architecture and participating classes

- [`TaskController`](../../../src/main/java/io/backend/lined/task/api/TaskController.java) implements create, partial update, visibility-filtered list, personal list, and delete operations.
- [`TaskServiceImpl`](../../../src/main/java/io/backend/lined/task/service/TaskServiceImpl.java) applies privacy, assignment, authorization, idempotency, and version rules.
- [`TaskEntity`](../../../src/main/java/io/backend/lined/task/domain/TaskEntity.java), repository, `TaskStatus`, `TaskPriority`, and `TaskVisibility` define persisted state and queries.
- [`TaskAccessPolicy`](../../../src/main/java/io/backend/lined/task/service/TaskAccessPolicy.java), lobby write policy, and [`NotificationService`](../../../src/main/java/io/backend/lined/notification/service/NotificationService.java) provide cross-feature access, restriction, and optional assignee notification behavior.

## Interactions and data flow

Create and update resolve the requester and lobby, enforce private-task self-assignment, then persist and optionally notify the assignee. Listing passes requester identity into repository/service visibility filters. Writes require `If-Match`; create accepts an optional `Idempotency-Key` so an identical retry can replay the original result instead of creating another task.

## API behavior and references

The [tasks API section](../../foundation/api.md#tasks) is the route and DTO contract. See [RFC 9110 conditional requests](https://www.rfc-editor.org/rfc/rfc9110#section-13.1) and the repository's [`IdempotencyService`](../../../src/main/java/io/backend/lined/common/idempotency/IdempotencyService.java) for the two retry-safety mechanisms.
