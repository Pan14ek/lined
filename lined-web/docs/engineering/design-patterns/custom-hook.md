> Status: Active
> Applies to: React 19 / TypeScript 6
> Category: Web Application Pattern

# Custom Hook

## Purpose
Encapsulates reusable React lifecycle, query, or UI behavior behind a focused hook.

## Applicability
Use for behavior with a stable input/output contract, especially TanStack Query flows.

## Ownership
Feature owns domain hooks; src/hooks owns domain-neutral hooks.

## Anti-patterns
Do not wrap one obvious expression or hide a page's important business flow.

## Relationship to Lined web architecture
Feature-first ownership, TanStack Query for server state, Zustand for UI state, public design-system wrappers, MSW for network tests, and the prod/dev API switch remain the existing model.

## Testing implications
Test hooks with renderHook and MSW, visible behavior with Testing Library, cache semantics at the query boundary, and public components with stories plus behavior tests.

## When not to introduce it
Do not add this structure because it has a familiar name. Prefer a direct feature-local implementation when no stable reuse or interaction seam exists.
