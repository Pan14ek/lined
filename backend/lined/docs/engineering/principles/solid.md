> Status: Active
> Applies to: Java 21 / Spring Boot 3.5.x / React 19 / TypeScript 6
> Category: Engineering Principle

# SOLID

## Definition
Use focused modules, stable seams, substitutable adapters, small contracts, and dependency direction to keep change local.

## Goal
Make the smallest correct change while keeping semantic ownership, locality, and testability visible.

## Practical signals
A module that changes for unrelated reasons or exposes implementation details is a signal for review.

## Common misuse
SOLID is a diagnostic lens, not a mandate to split every class or add interfaces.

## Do not over-apply
A principle is a decision lens, not a universal transformation. Compare ownership, change reasons, and externally visible behavior before editing structure.

## Java example
~~~java
boolean allowed = taskAccessPolicy.canRead(task, currentUserId);
~~~
Lined services own rules, repositories own persistence access, and policies own authorization decisions.

## TypeScript example
~~~ts
const queryKey = QUERY_KEYS.lobbyTasks(lobbyId);
const { data } = useQuery({ queryKey, queryFn: () => listTasks({ lobbyId }) });
~~~
Feature APIs own domain DTOs while shared infrastructure owns only domain-agnostic transport behavior.

## Interaction with Lined ownership rules
Backend behavior remains Controller -> Service -> Repository -> Entity, with policies and mappers at their existing seams. Web behavior remains feature-first, with TanStack Query for server state and public design-system wrappers for generic UI.

## Decision checklist
- What semantic responsibility is being changed?
- Which existing owner already knows this concept?
- Is the proposed move behavior-preserving and test-protected?
- Does it reduce coupling without creating speculative reuse?
