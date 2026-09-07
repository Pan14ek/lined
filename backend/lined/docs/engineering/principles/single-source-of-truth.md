> Status: Active
> Applies to: Java 21 / Spring Boot 3.5.x / React 19 / TypeScript 6
> Category: Engineering Principle

# Single Source of Truth

## Definition
Each semantic rule has one authoritative definition and explicit consumers.

## Goal
Make the smallest correct change while keeping semantic ownership, locality, and testability visible.

## Practical signals
Conflicting password, status, or entitlement rules indicate multiple authorities.

## Common misuse
A single source does not mean one global file; ownership must remain meaningful.

## Do not over-apply
A principle is a decision lens, not a universal transformation. Compare ownership, change reasons, and externally visible behavior before editing structure.

## Java example
~~~java
boolean allowed = taskAccessPolicy.canRead(task, currentUserId);
~~~
Persisted plan codes and entitlement evaluation have domain owners rather than duplicated controller checks.

## TypeScript example
~~~ts
const queryKey = QUERY_KEYS.lobbyTasks(lobbyId);
const { data } = useQuery({ queryKey, queryFn: () => listTasks({ lobbyId }) });
~~~
Query keys are defined by their feature and reused by its hooks and tests.

## Interaction with Lined ownership rules
Backend behavior remains Controller -> Service -> Repository -> Entity, with policies and mappers at their existing seams. Web behavior remains feature-first, with TanStack Query for server state and public design-system wrappers for generic UI.

## Decision checklist
- What semantic responsibility is being changed?
- Which existing owner already knows this concept?
- Is the proposed move behavior-preserving and test-protected?
- Does it reduce coupling without creating speculative reuse?
