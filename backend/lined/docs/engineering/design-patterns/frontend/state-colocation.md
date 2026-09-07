> Status: Active
> Applies to: Java 21 / Spring Boot 3.5.x / React 19 / TypeScript 6
> Category: Frontend Application Pattern

# State Colocation

## Purpose
Keeps state at the narrowest owner that needs it.

## Applicability
Use local state for local interaction, feature store for shared UI state, Query for server state.

## Ownership
Owner: smallest stable scope that preserves behavior.

## Anti-patterns
Do not lift state only because it might be useful later.

## Relationship to Lined web architecture
Feature-first ownership, TanStack Query for server state, Zustand for UI state, public design-system wrappers, MSW for network tests, and the prod/dev API switch remain the existing model.

## Testing implications
Test hooks with renderHook and MSW, visible behavior with Testing Library, cache semantics at the query boundary, and public components with stories plus behavior tests.

## When not to introduce it
Do not add this structure because it has a familiar name. Prefer a direct feature-local implementation when no stable reuse or interaction seam exists.
