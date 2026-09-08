> Status: Active
> Applies to: Java 21 / Spring Boot 3.5.x / React 19 / TypeScript 6
> Category: Code Smell

# Data Class

## Intent / why this smell matters
A structure exposes data while behavior that protects its invariants lives elsewhere. Encapsulate Field, Move Method, Replace Data Value with Object

## Definition
A structure exposes data while behavior that protects its invariants lives elsewhere.

## Typical signals
Many getters/setters, public mutation, and anemic callers with duplicated rules.

## False positives
A signal does not prove a defect. Stable framework contracts, DTOs, generated code, and cohesive aggregates may look like this without needing refactoring.

## Why it becomes expensive
Review the deletion test and ask whether the proposed change would improve locality or merely move lines.

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
DTOs and persistence entities can be intentionally data-oriented.

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
