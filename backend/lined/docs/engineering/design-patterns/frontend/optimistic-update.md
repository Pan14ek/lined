> Status: Active
> Applies to: Java 21 / Spring Boot 3.5.x / React 19 / TypeScript 6
> Category: Frontend Application Pattern

# Optimistic Update

## Purpose
Updates cached UI before a write completes, with snapshot and rollback behavior.

## Applicability
Use when latency matters and the mutation has a clear reversible cache representation.

## Ownership
Owner: feature hook; error semantics must distinguish missing resources from transient failure.

## Anti-patterns
Do not use it when rollback is ambiguous or side effects are non-local.

## Relationship to Lined web architecture
Feature-first ownership, TanStack Query for server state, Zustand for UI state, public design-system wrappers, MSW for network tests, and the prod/dev API switch remain the existing model.

## Testing implications
Test hooks with renderHook and MSW, visible behavior with Testing Library, cache semantics at the query boundary, and public components with stories plus behavior tests.

## When not to introduce it
Do not add this structure because it has a familiar name. Prefer a direct feature-local implementation when no stable reuse or interaction seam exists.
