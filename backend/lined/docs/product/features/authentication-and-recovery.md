# Authentication and Recovery

## Purpose and scope

This feature verifies a registered user's password and supports signed-out password recovery. It issues a short-lived, Bearer-shaped login token, but it does **not** yet authenticate ordinary requests: caller-scoped routes still use the transitional `X-User-Id` header.

## Architecture and participating classes

- [`AuthController`](../../../src/main/java/io/backend/lined/auth/api/AuthController.java) is the HTTP boundary for login and the two recovery operations.
- [`AuthServiceImpl`](../../../src/main/java/io/backend/lined/auth/service/AuthServiceImpl.java) resolves email or username, checks the encoded password, and builds the login response through `AuthTokenService`.
- [`PasswordResetServiceImpl`](../../../src/main/java/io/backend/lined/auth/service/PasswordResetServiceImpl.java) creates 256-bit opaque tokens, persists only HMAC-SHA256 hashes in [`PasswordResetTokenEntity`](../../../src/main/java/io/backend/lined/auth/domain/PasswordResetTokenEntity.java), and conditionally claims one unexpired token before changing the password.
- [`SecurityConfig`](../../../src/main/java/io/backend/lined/config/SecurityConfig.java) provides the password encoder; [`UserRepository`](../../../src/main/java/io/backend/lined/user/domain/UserRepository.java) supplies identifier lookup.

## Interactions and data flow

`POST /api/auth/login` maps request DTO → user lookup → password comparison → token-shaped response including user roles. A reset request always returns `202`; for a known account it writes a hash with a 30-minute expiry. Reset redemption atomically marks a token used, updates the encoded password, and invalidates sibling tokens, so concurrent reuse cannot produce two password changes.

## API behavior and references

See the authoritative [authentication API](../../foundation/api.md#authentication), [Spring Security password storage guidance](https://docs.spring.io/spring-security/reference/features/authentication/password-storage.html), and [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html). The latter explains the deliberately uniform recovery response; the former explains the `PasswordEncoder` boundary.
