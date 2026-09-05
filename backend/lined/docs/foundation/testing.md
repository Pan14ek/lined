# Backend Testing Guide

## Test Stack

Backend tests use:

- JUnit 5
- Mockito
- AssertJ
- H2 for fast Spring/JPA tests
- PostgreSQL Testcontainers for database-contract and HTTP integration tests

Run tests from `backend/lined/`:

```bash
./gradlew test
./gradlew check
./gradlew jacocoTestReport
./gradlew integrationTest
```

The pull-request CI workflow runs the same backend gates and additionally runs
the web verification suite from `lined-web/`:

```bash
npm ci
npm run lint
npm run typecheck
npm run test:run
npm run build
```

## Default Test Style

Use fast unit tests for service behavior by default:

```java

@ExtendWith(MockitoExtension.class)
class SomeServiceImplTest {

  @Mock
  private SomeRepository repo;

  @InjectMocks
  private SomeServiceImpl service;

  @Test
  void create_success() {
    // arrange, act, assert
  }
}
```

Use `@SpringBootTest` only when the test needs Spring wiring, persistence
behavior, configuration, or an integration boundary.

## What to Test

Every new service behavior should have tests for:

| Case                             | Expectation                                                 |
|----------------------------------|-------------------------------------------------------------|
| Success path                     | Returns the expected DTO or state change.                   |
| Missing entity                   | Throws the expected not-found exception.                    |
| Invalid input                    | Rejects invalid state and does not persist changes.         |
| Authorization or membership rule | Rejects users without required ownership or membership.     |
| Partial update                   | Changes only non-null or intentionally provided fields.     |
| Repository interaction           | Saves, deletes, or avoids persistence calls as appropriate. |

## Naming Pattern

Use descriptive test names in this style:

```text
create_success
create_throwsNoSuchElement_whenOwnerNotFound
update_updatesOnlyNonNullFields
delete_throwsSecurityException_whenRequesterIsNotOwner
```

Keep arrange/act/assert blocks clear. Comments are optional when the test body
is already readable.

## Test Data

- Build minimal entities in `@BeforeEach` when many tests share the same setup.
- Keep IDs stable and obvious, such as `1L` for owner and `2L` for member.
- Prefer real DTO records over mocks for request/response values.
- Mock mappers unless the mapper itself is the subject of the test.

## HTTP API Integration Tests

Full HTTP API integration tests live in `src/integrationTest/`. They start Spring Boot on a
random port and connect it to a disposable PostgreSQL Testcontainer; ordinary unit-test runs do
not start Docker.

```bash
docker info
./gradlew test integrationTest
```

The integration profile starts with an empty PostgreSQL 16 database. Flyway
applies the complete migration history before Hibernate starts, and Hibernate
then validates the resulting schema with `ddl-auto=validate`. Spring SQL
initialization is disabled. This makes the HTTP integration suite a fresh-database
migration check as well as an API test suite.

Its reports are written to `build/test-results/integrationTest/` and
`build/reports/tests/integrationTest/`. Before treating a run as PostgreSQL proof, inspect the
XML reports and confirm zero failures, errors, and skips.

Caller-scoped scenarios authenticate with `Authorization: Bearer <JWT>` and
verify that identity comes from the validated JWT subject. The regression suite
intentionally sends one conflicting `X-User-Id` header to prove it is ignored;
it is not a supported authentication mechanism.

## H2-backed Persistence Tests

H2 remains intentionally non-authoritative. Tests that use H2 disable Flyway
because the production migrations contain PostgreSQL-specific constraints and
indexes. Hibernate `create-drop` supplies only the schema needed by those fast
mapping/repository tests.

Do not use H2 results as proof that a migration works on PostgreSQL. Any new
schema feature, PostgreSQL constraint, expression/partial index, or migration
must be covered by a PostgreSQL/Testcontainers path.

## Other Integration Tests

Use integration tests when validating:

- Spring context loading
- repository behavior against the intended database engine
- HTTP endpoint behavior
- serialization and validation behavior
- application configuration
- migration behavior and PostgreSQL-only schema invariants

Tests that explicitly activate `test` use
`src/test/resources/application-test.properties`, which configures H2,
disables Flyway, and uses Hibernate `create-drop`.

## Quality Expectations

- Do not delete tests to improve coverage.
- Do not add slow Spring tests for simple service logic.
- Keep tests deterministic; avoid real clocks where exact time matters.
- Backend documentation-only changes do not require backend tests, but should
  pass documentation validation and `git diff --check`.
