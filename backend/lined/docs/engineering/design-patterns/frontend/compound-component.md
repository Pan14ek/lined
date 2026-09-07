> Status: Active
> Applies to: Java 21 / Spring Boot 3.5.x / React 19 / TypeScript 6
> Category: Frontend Application Pattern

# Compound Component

## Purpose
Coordinates related child components through an explicit parent-owned interaction model.

## Applicability
Use for genuinely coupled UI parts such as a dialog with structured slots or tabs.

## Ownership
Owner: public UI when domain-neutral; feature layer when domain-specific.

## Anti-patterns
Do not introduce context and many slots for a simple component.

## Relationship to Lined web architecture
Feature-first ownership, TanStack Query for server state, Zustand for UI state, public design-system wrappers, MSW for network tests, and the prod/dev API switch remain the existing model.

## Testing implications
Test hooks with renderHook and MSW, visible behavior with Testing Library, cache semantics at the query boundary, and public components with stories plus behavior tests.

## When not to introduce it
Do not add this structure because it has a familiar name. Prefer a direct feature-local implementation when no stable reuse or interaction seam exists.
