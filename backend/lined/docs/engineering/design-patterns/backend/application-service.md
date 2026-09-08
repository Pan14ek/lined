> Status: Active
> Applies to: Java 21 / Spring Boot 3.5.x / React 19 / TypeScript 6
> Category: Backend Application Pattern

# Application Service

## Purpose
Coordinates a use case across domain objects, policies, repositories, and transactions.

## Applicability
Use when orchestration is larger than a controller but does not belong to one entity.

## Ownership
Owner: application/use-case module; keep controllers thin and repositories persistence-only.

## Anti-patterns
Do not create a pass-through service for one repository call without a rule or seam.

## Relationship to Spring
Keep Controller -> Service -> Repository -> Entity direction explicit. Use Spring only where its lifecycle, transaction, or persistence contract is part of the seam; do not let annotations hide ownership.

## Relationship to GoF patterns
This is an application architecture practice. It may compose Adapter, Strategy, State, or Template Method, but the name alone does not require a GoF implementation.

## Testing implications
Test the externally meaningful contract at the narrowest stable seam. Add service/policy tests for decisions, persistence tests for query behavior, and integration tests for HTTP or transaction guarantees.

## When not to introduce it
Do not add this structure because it appears in a catalog. Require a repeated responsibility, real seam, or operational guarantee and record the alternative that was rejected.
