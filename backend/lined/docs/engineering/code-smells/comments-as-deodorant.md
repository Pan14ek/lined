> Status: Active
> Applies to: Java 21 / Spring Boot 3.5.x / React 19 / TypeScript 6
> Category: Code Smell

# Comments as Deodorant

## Intent / why this smell matters
Comments explain confusing code instead of the code expressing its intent. Extract Method, Rename Method, Introduce Assertion

## Definition
Comments explain confusing code instead of the code expressing its intent.

## Typical signals
Warnings that contradict implementation or comments needed to call a method safely.

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
A comment can document external constraints or a non-obvious invariant.

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
