> Status: Active
> Applies to: Java 21 / Spring Boot 3.5.x / React 19 / TypeScript 6
> Category: Frontend Application Pattern

# Controlled versus Uncontrolled Component

## Purpose
Chooses whether the caller or component owns interaction state.

## Applicability
Use controlled mode when state must coordinate with a form/query; uncontrolled for isolated input.

## Ownership
Owner and source of truth must be explicit; avoid hidden dual ownership.

## Anti-patterns
Do not offer both modes without a real consumer need.

## Relationship to Lined web architecture
Feature-first ownership, TanStack Query for server state, Zustand for UI state, public design-system wrappers, MSW for network tests, and the prod/dev API switch remain the existing model.

## Testing implications
Test hooks with renderHook and MSW, visible behavior with Testing Library, cache semantics at the query boundary, and public components with stories plus behavior tests.

## When not to introduce it
Do not add this structure because it has a familiar name. Prefer a direct feature-local implementation when no stable reuse or interaction seam exists.
