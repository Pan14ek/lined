> Status: Active
> Applies to: React 19 / TypeScript 6
> Category: Web Application Pattern

# Feature Folder

## Purpose
Groups model, API, hooks, utilities, pages, and UI for one cohesive domain.

## Applicability
Use the existing src/features/{feature} structure to keep change local and discoverable.

## Ownership
Owner: feature; cross-feature imports are allowed when dependency ownership is real.

## Anti-patterns
Do not create a feature folder for generic transport or presentation infrastructure.

## Relationship to Lined web architecture
Feature-first ownership, TanStack Query for server state, Zustand for UI state, public design-system wrappers, MSW for network tests, and the prod/dev API switch remain the existing model.

## Testing implications
Test hooks with renderHook and MSW, visible behavior with Testing Library, cache semantics at the query boundary, and public components with stories plus behavior tests.

## When not to introduce it
Do not add this structure because it has a familiar name. Prefer a direct feature-local implementation when no stable reuse or interaction seam exists.
