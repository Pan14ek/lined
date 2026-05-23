# Backend Testing Guide

## Test Stack

Backend tests use:

- JUnit 5
- Mockito
- AssertJ
- H2 for Spring-backed tests

Run tests from `backend/lined/`:

```bash
./gradlew test
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

## Integration Tests

Use integration tests when validating:

- Spring context loading
- Repository behavior against H2
- HTTP endpoint behavior
- serialization and validation behavior
- application configuration

Tests use `src/test/resources/application-test.properties`, which configures
H2 and avoids requiring local PostgreSQL.

## Quality Expectations

- Do not delete tests to improve coverage.
- Do not add slow Spring tests for simple service logic.
- Keep tests deterministic; avoid real clocks where exact time matters.
- Backend documentation-only changes do not require backend tests, but should
  pass documentation validation and `git diff --check`.
