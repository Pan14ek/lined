> Status: Active
> Applies to: Java 21 / Spring Boot 3.5.x / React 19 / TypeScript 6
> Category: Frontend Application Pattern

# API Adapter Switch

## Purpose
Keeps production and development API implementations behind one feature-owned function contract.

## Applicability
Use the existing api/prod.ts, api/dev.ts, and api/index.ts convention.

## Ownership
Owner: feature API; shared apiClient owns transport mechanics.

## Anti-patterns
Do not make components choose between mock and production implementations.

## Relationship to Lined web architecture
Feature-first ownership, TanStack Query for server state, Zustand for UI state, public design-system wrappers, MSW for network tests, and the prod/dev API switch remain the existing model.

## Testing implications
Test hooks with renderHook and MSW, visible behavior with Testing Library, cache semantics at the query boundary, and public components with stories plus behavior tests.

## When not to introduce it
Do not add this structure because it has a familiar name. Prefer a direct feature-local implementation when no stable reuse or interaction seam exists.
