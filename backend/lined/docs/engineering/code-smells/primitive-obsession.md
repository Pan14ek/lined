> Status: Active
> Applies to: Java 21 / Spring Boot 3.5.x / React 19 / TypeScript 6
> Category: Code Smell

# Primitive Obsession

## Intent / why this smell matters
A meaningful domain concept is represented by unvalidated strings, numbers, or flags. Replace Data Value with Object, Replace Magic Number with Symbolic Constant, Introduce Parameter Object

## Definition
A meaningful domain concept is represented by unvalidated strings, numbers, or flags.

## Typical signals
Repeated parsing, range checks, status literals, or parameter pairs.

## False positives
A signal does not prove a defect. Stable framework contracts, DTOs, generated code, and cohesive aggregates may look like this without needing refactoring.

## Why it becomes expensive
A numeric timeout, password limit, or status code should be named at the owner that defines its meaning; equal values are not automatically one concept.

## Java example
~~~java
boolean allowed = accessPolicy.canRead(entity, currentUserId);
~~~

## TypeScript example
~~~ts
const result = useQuery({ queryKey: QUERY_KEYS.items, queryFn: listItems });
~~~

## Detection guidance
Combine search, callers, change history, tests, ownership context, and the Pattern Registry. CPD and jscpd detect text; they cannot decide semantic ownership.

## Preferred refactorings
A primitive is fine when it has no invariant and no domain vocabulary.

## Related patterns
Policy, Application Service, Mapper, Adapter, Strategy, and feature-folder ownership are possible responses only when their forces are present.

## When NOT to refactor
Do not refactor because a metric or catalog entry exists. Keep the current design when it is clearer, the concept is intentionally local, or a transformation would add coupling or ceremony.

## Testing implications
Protect externally visible behavior first: authorization, API contracts, persistence invariants, cache semantics, and user-visible states. Add characterization tests before behavior-sensitive movement.

## Decision checklist
- Is this semantic duplication or only similar text?
- Who owns the invariant?
- Would deletion reduce complexity?
- Is the replacement simpler and test-protected?
- Is the scope bounded and documented?
