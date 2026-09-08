> Status: Active
> Applies to: Java 21 / Spring Boot 3.5.x / React 19 / TypeScript 6
> Category: Backend Application Pattern

# Port and Adapter

## Purpose
Places a stable application contract at a seam with replaceable technology adapters.

## Applicability
Use when an external system, framework identity, or infrastructure choice can vary or must be isolated.

## Ownership
Owner: application port; adapters own provider/framework translation.

## Anti-patterns
Do not add ports around stable in-process code with no substitution force.

## Relationship to Spring
Keep Controller -> Service -> Repository -> Entity direction explicit. Use Spring only where its lifecycle, transaction, or persistence contract is part of the seam; do not let annotations hide ownership.

## Relationship to GoF patterns
This is an application architecture practice. It may compose Adapter, Strategy, State, or Template Method, but the name alone does not require a GoF implementation.

## Testing implications
Test the externally meaningful contract at the narrowest stable seam. Add service/policy tests for decisions, persistence tests for query behavior, and integration tests for HTTP or transaction guarantees.

## When not to introduce it
Do not add this structure because it appears in a catalog. Require a repeated responsibility, real seam, or operational guarantee and record the alternative that was rejected.
