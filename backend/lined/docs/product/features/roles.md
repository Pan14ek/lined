# Roles

## Purpose and scope

Roles are the reusable role catalog and user-role assignment capability. They project into `UserDto` and login responses, and are initialized during account registration. The current controller exposes role mutation routes without a separate request-authorization layer.

## Architecture and participating classes

- [`RoleController`](../../../src/main/java/io/backend/lined/role/api/RoleController.java) lists names, ensures role records, and replaces/adds/removes a user's role set.
- [`RoleServiceImpl`](../../../src/main/java/io/backend/lined/role/service/RoleServiceImpl.java) validates and persists assignments.
- [`RoleResolverImpl`](../../../src/main/java/io/backend/lined/role/service/RoleResolverImpl.java), [`RoleRepository`](../../../src/main/java/io/backend/lined/role/domain/RoleRepository.java), and [`RoleEntity`](../../../src/main/java/io/backend/lined/role/domain/RoleEntity.java) resolve catalog records.
- [`AccountApplicationServiceImpl`](../../../src/main/java/io/backend/lined/app/AccountApplicationServiceImpl.java) applies the configured default role set during registration.

## Interactions and data flow

Role assignments are stored on the user relationship and returned by the user mapper. Registration invokes role assignment after user creation; login reads the mapped roles into its response. User search can query by role. Roles therefore define account metadata today, not an HTTP authorization decision point.

## API behavior and references

See the [roles API section](../../foundation/api.md#roles). [Spring Security authorization](https://docs.spring.io/spring-security/reference/servlet/authorization/index.html) provides the distinction between storing authorities and enforcing them; this backend currently implements the former at these routes.
