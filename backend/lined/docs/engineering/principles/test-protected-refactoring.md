> Status: Active
> Applies to: Java 21 / Spring Boot 3.5.x / React 19 / TypeScript 6
> Category: Engineering Principle

# Test-Protected Refactoring

## Definition
Observe behavior with externally meaningful tests before changing structure that could alter it.

## Goal
Make the smallest correct change while keeping semantic ownership, locality, and testability visible.

## Practical signals
Missing authorization, cache, persistence, and error-path tests make refactoring unsafe.

## Common misuse
Do not test private implementation details merely to obtain coverage.

## Do not over-apply
A principle is a decision lens, not a universal transformation. Compare ownership, change reasons, and externally visible behavior before editing structure.

## Java example
~~~java
boolean allowed = taskAccessPolicy.canRead(task, currentUserId);
~~~
Add service and integration characterization tests before moving policy or persistence logic.

## TypeScript example
~~~ts
const queryKey = QUERY_KEYS.lobbyTasks(lobbyId);
const { data } = useQuery({ queryKey, queryFn: () => listTasks({ lobbyId }) });
~~~
Protect visible states, hook cache behavior, and network error handling through MSW-backed tests.

## Interaction with Lined ownership rules
Backend behavior remains Controller -> Service -> Repository -> Entity, with policies and mappers at their existing seams. Web behavior remains feature-first, with TanStack Query for server state and public design-system wrappers for generic UI.

## Decision checklist
- What semantic responsibility is being changed?
- Which existing owner already knows this concept?
- Is the proposed move behavior-preserving and test-protected?
- Does it reduce coupling without creating speculative reuse?
