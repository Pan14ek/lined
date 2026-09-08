> Status: Active
> Applies to: Java 21 / Spring Boot 3.5.x / React 19 / TypeScript 6
> Category: Code Smell

# Shotgun Surgery

## Intent / why this smell matters
One conceptual change requires edits in many scattered places. Move Method, Extract Class, Inline Class, Single Source of Truth

## Definition
One conceptual change requires edits in many scattered places.

## Typical signals
Adding one rule means touching controllers, services, tests, and duplicate helpers.

## False positives
A signal does not prove a defect. Stable framework contracts, DTOs, generated code, and cohesive aggregates may look like this without needing refactoring.

## Why it becomes expensive
If a new privacy rule requires scattered edits, first identify the feature policy owner before creating a global abstraction.

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
A cross-cutting concern may intentionally span seams when the contract requires it.

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
