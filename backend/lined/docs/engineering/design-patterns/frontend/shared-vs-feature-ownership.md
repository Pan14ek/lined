> Status: Active
> Applies to: Java 21 / Spring Boot 3.5.x / React 19 / TypeScript 6
> Category: Frontend Application Pattern

# Shared versus Feature Ownership

## Purpose
Keeps domain knowledge in a feature and generic infrastructure in shared folders.

## Applicability
Promotion needs two unrelated consumers, domain-neutral semantics, and lower coupling.

## Ownership
Owner follows the model and rule being owned, not how reusable code might become.

## Anti-patterns
Do not move a lobby/task abstraction to shared merely because its type is small.

## Relationship to Lined web architecture
Feature-first ownership, TanStack Query for server state, Zustand for UI state, public design-system wrappers, MSW for network tests, and the prod/dev API switch remain the existing model.

## Testing implications
Test hooks with renderHook and MSW, visible behavior with Testing Library, cache semantics at the query boundary, and public components with stories plus behavior tests.

## When not to introduce it
Do not add this structure because it has a familiar name. Prefer a direct feature-local implementation when no stable reuse or interaction seam exists.
