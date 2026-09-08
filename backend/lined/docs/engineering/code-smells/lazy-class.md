> Status: Active
> Applies to: Java 21 / Spring Boot 3.5.x / React 19 / TypeScript 6
> Category: Code Smell

# Lazy Class

## Intent / why this smell matters
A class adds little value beyond forwarding or a trivial wrapper. Inline Class, Remove Middle Man

## Definition
A class adds little value beyond forwarding or a trivial wrapper.

## Typical signals
Deletion test removes no complexity; callers know as much as the class.

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
A small adapter or seam can be valuable despite few lines.

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
