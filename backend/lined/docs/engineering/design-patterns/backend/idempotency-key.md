> Status: Active
> Applies to: Java 21 / Spring Boot 3.5.x / React 19 / TypeScript 6
> Category: Backend Application Pattern

# Idempotency Key

## Purpose
Makes retryable writes safe by associating a request key with a stable outcome.

## Applicability
Use for externally retried or user-visible commands where duplicate effects are harmful.

## Ownership
Owner: command/application boundary; storage and expiry are explicit.

## Anti-patterns
Do not add it to read-only or naturally idempotent operations.

## Relationship to Spring
Keep Controller -> Service -> Repository -> Entity direction explicit. Use Spring only where its lifecycle, transaction, or persistence contract is part of the seam; do not let annotations hide ownership.

## Relationship to GoF patterns
This is an application architecture practice. It may compose Adapter, Strategy, State, or Template Method, but the name alone does not require a GoF implementation.

## Testing implications
Test the externally meaningful contract at the narrowest stable seam. Add service/policy tests for decisions, persistence tests for query behavior, and integration tests for HTTP or transaction guarantees.

## When not to introduce it
Do not add this structure because it appears in a catalog. Require a repeated responsibility, real seam, or operational guarantee and record the alternative that was rejected.
