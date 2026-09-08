> Status: Active
> Applies to: Java 21 / Spring Boot 3.5.x / React 19 / TypeScript 6
> Category: Backend Application Pattern

# Mapper

## Purpose
Translates persistence/domain objects to API contracts without leaking entity structure.

## Applicability
Use MapStruct for stable DTO transformations and explicit non-trivial mappings.

## Ownership
Owner: API boundary of the feature; mapper code must not decide authorization.

## Anti-patterns
Do not create a mapper for a trivial pass-through unless it protects a boundary.

## Relationship to Spring
Keep Controller -> Service -> Repository -> Entity direction explicit. Use Spring only where its lifecycle, transaction, or persistence contract is part of the seam; do not let annotations hide ownership.

## Relationship to GoF patterns
This is an application architecture practice. It may compose Adapter, Strategy, State, or Template Method, but the name alone does not require a GoF implementation.

## Testing implications
Test the externally meaningful contract at the narrowest stable seam. Add service/policy tests for decisions, persistence tests for query behavior, and integration tests for HTTP or transaction guarantees.

## When not to introduce it
Do not add this structure because it appears in a catalog. Require a repeated responsibility, real seam, or operational guarantee and record the alternative that was rejected.
