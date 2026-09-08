> Status: Active
> Applies to: React 19 / TypeScript 6
> Category: Web Application Pattern

# Server State versus Client State

## Purpose
Keeps remote data in TanStack Query and local UI state in Zustand or component state.

## Applicability
Use Query for fetch lifecycle/cache and client state for view/control state.

## Ownership
Owner follows the state source; do not mirror server data into stores.

## Anti-patterns
Do not use a global store to bypass query invalidation.

## Relationship to Lined web architecture
Feature-first ownership, TanStack Query for server state, Zustand for UI state, public design-system wrappers, MSW for network tests, and the prod/dev API switch remain the existing model.

## Testing implications
Test hooks with renderHook and MSW, visible behavior with Testing Library, cache semantics at the query boundary, and public components with stories plus behavior tests.

## When not to introduce it
Do not add this structure because it has a familiar name. Prefer a direct feature-local implementation when no stable reuse or interaction seam exists.
