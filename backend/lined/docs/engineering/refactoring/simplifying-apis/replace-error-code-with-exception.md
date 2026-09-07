> Status: Active
> Applies to: Java 21 / Spring Boot 3.5.x / React 19 / TypeScript 6
> Category: Refactoring Technique

# Replace Error Code With Exception

## Intent
Use typed failure flow when an error code forces caller branching.

## Problem
Callers repeatedly inspect codes and duplicate error mapping.

## Preconditions
Create a meaningful exception, map it at the boundary, and preserve protocol status. Confirm ownership, search the Pattern Registry, and add characterization tests if the change can affect behavior.

## Transformation steps
1. Record current externally meaningful behavior.
2. Make the smallest structural change described above.
3. Compile and run focused tests.
4. Review callers, ownership, and error/ordering semantics.
5. Remove compatibility code only after the new owner is proven.

## Before example
~~~java
return legacyOwner.calculate(input, 15);
~~~

## After example
~~~java
return namedOwner.calculate(input, DOMAIN_LIMIT);
~~~

## Java example
~~~java
public Result apply(Request request) {
  return ownerSpecificOperation(request);
}
~~~

## TypeScript example
~~~ts
const result = namedOperation(input);
~~~

## Benefits
The change should improve locality and leverage: callers learn less, the owner expresses intent, and tests can protect a smaller stable seam.

## Risks
Watch for changed evaluation order, transaction boundaries, lazy loading, serialization, cache identity, error precedence, and public API compatibility.

## When NOT to use
Do not apply this technique because a catalog entry exists. Keep the current design when it is cohesive, local, clearer, or when the proposed abstraction is speculative.

## Test strategy
Use the red/green loop: observe behavior, add service/API/UI characterization tests, make one transformation, rerun focused tests, then run the full applicable gates. Test externally visible invariants rather than private call structure.

## Related smells
Duplicate Code, Long Method, Feature Envy, Shotgun Surgery, Divergent Change, Middle Man, or Speculative Generality may be signals, but none is proof.

## Related patterns
Application Service, Policy, Adapter, Strategy, State, Template Method, Mapper, and feature-folder ownership may apply only when their forces are demonstrated.

## Related techniques
Use Extract Method, Move Method, Extract Class, Rename Method, or Introduce Assertion as smaller steps when appropriate.

## Decision checklist
- Is the responsibility semantic and owned by the proposed target?
- Is there an existing owner to REUSE or EXTEND?
- Is EXTRACT safer than CREATE?
- Are tests protecting behavior before movement?
- Is the change bounded, reversible, and documented?
