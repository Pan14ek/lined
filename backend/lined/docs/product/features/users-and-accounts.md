# Users and Accounts

## Purpose and scope

Users are the account and profile records behind every lobby, task, event, role assignment, preference, and billing account. The feature covers registration, profile lookup/update, search, and self-service deletion; authentication and role administration are documented separately.

## Architecture and participating classes

- [`UserController`](../../../src/main/java/io/backend/lined/user/api/UserController.java) exposes `/api/users` and returns versioned `UserDto` representations.
- [`UserServiceImpl`](../../../src/main/java/io/backend/lined/user/service/UserServiceImpl.java), [`UserRepository`](../../../src/main/java/io/backend/lined/user/domain/UserRepository.java), and [`UserEntity`](../../../src/main/java/io/backend/lined/user/domain/UserEntity.java) implement profile persistence and search.
- [`AccountApplicationServiceImpl`](../../../src/main/java/io/backend/lined/app/AccountApplicationServiceImpl.java) orchestrates registration: it creates the user, gives default roles, creates a personal billing account, then returns the enriched profile.
- [`VersionPrecondition`](../../../src/main/java/io/backend/lined/common/VersionPrecondition.java) converts `If-Match` into optimistic-concurrency checks.

## Interactions and data flow

Registration flows controller → account application service → user service → role and billing services in one transaction. Updates and deletion require the ETag version; deletion also verifies that `X-User-Id` matches the path user and that the user owns no lobby. Search is read-only and can filter by role through the role relationship.

## API behavior and references

The [users API section](../../foundation/api.md#users) is authoritative for payloads and statuses. See [Spring Data JPA repositories](https://docs.spring.io/spring-data/jpa/reference/jpa.html) for the repository model and [HTTP conditional requests (RFC 9110)](https://www.rfc-editor.org/rfc/rfc9110#section-13.1) for the ETag/`If-Match` mechanism.
