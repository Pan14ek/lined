> Status: Active
> Applies to: Java 21 / Spring Boot 3.5.x / React 19 / TypeScript 6
> Category: Engineering Principle

# Boy Scout Rule

## Definition
Leave directly related touched code clearer when a bounded, behavior-preserving improvement is safe.

## Goal
Make the smallest correct change while keeping semantic ownership, locality, and testability visible.

## Practical signals
A nearby duplicate helper that blocks the requested change is a candidate; unrelated cleanup is not.

## Common misuse
Do not turn a feature task into a repository-wide cleanup.

## Do not over-apply
A principle is a decision lens, not a universal transformation. Compare ownership, change reasons, and externally visible behavior before editing structure.

## Java example
~~~java
boolean allowed = taskAccessPolicy.canRead(task, currentUserId);
~~~
Extracting a duplicated task cache update while changing task mutation behavior is bounded.

## TypeScript example
~~~ts
const queryKey = QUERY_KEYS.lobbyTasks(lobbyId);
const { data } = useQuery({ queryKey, queryFn: () => listTasks({ lobbyId }) });
~~~
Replacing a repeated feature-owned formatter while touching the same rendering path can be appropriate.

## Interaction with Lined ownership rules
Backend behavior remains Controller -> Service -> Repository -> Entity, with policies and mappers at their existing seams. Web behavior remains feature-first, with TanStack Query for server state and public design-system wrappers for generic UI.

## Decision checklist
- What semantic responsibility is being changed?
- Which existing owner already knows this concept?
- Is the proposed move behavior-preserving and test-protected?
- Does it reduce coupling without creating speculative reuse?
