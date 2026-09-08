> Status: Active
> Applies to: React 19 / TypeScript 6
> Category: Web Application Pattern

# Query-Key Factory

## Purpose
Provides stable, feature-owned keys for TanStack Query cache identity and invalidation.

## Applicability
Use one QUERY_KEYS owner per feature and reuse it in hooks and tests.

## Ownership
Owner: the feature whose server state is cached.

## Anti-patterns
Do not centralize every feature's keys into a global registry.

## Relationship to Lined web architecture
Feature-first ownership, TanStack Query for server state, Zustand for UI state, public design-system wrappers, MSW for network tests, and the prod/dev API switch remain the existing model.

## Testing implications
Test hooks with renderHook and MSW, visible behavior with Testing Library, cache semantics at the query boundary, and public components with stories plus behavior tests.

## When not to introduce it
Do not add this structure because it has a familiar name. Prefer a direct feature-local implementation when no stable reuse or interaction seam exists.
