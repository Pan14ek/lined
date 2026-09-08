> Status: Active
> Applies to: Java 21 / Spring Boot 3.5.x / React 19 / TypeScript 6
> Category: Engineering Principle

# DRY

## Definition
Keep one authoritative owner for one semantic rule; remove duplicated responsibility, not merely matching text.

## Goal
Make the smallest correct change while keeping semantic ownership, locality, and testability visible.

## Practical signals
A duplicated authorization invariant in two services can drift even when its code looks different.

## Common misuse
Do not merge equal literals that represent different concepts; semantic ownership outranks line count.

## Do not over-apply
A principle is a decision lens, not a universal transformation. Compare ownership, change reasons, and externally visible behavior before editing structure.

## Java example
~~~java
boolean allowed = taskAccessPolicy.canRead(task, currentUserId);
~~~
EntityFinder centralizes lookup failure semantics; a task-specific status map remains task-owned.

## TypeScript example
~~~ts
const queryKey = QUERY_KEYS.lobbyTasks(lobbyId);
const { data } = useQuery({ queryKey, queryFn: () => listTasks({ lobbyId }) });
~~~
A shared TypeScript HTTP_STATUS object is appropriate for protocol semantics, while task labels stay task-owned.

## Interaction with Lined ownership rules
Backend behavior remains Controller -> Service -> Repository -> Entity, with policies and mappers at their existing seams. Web behavior remains feature-first, with TanStack Query for server state and public design-system wrappers for generic UI.

## Decision checklist
- What semantic responsibility is being changed?
- Which existing owner already knows this concept?
- Is the proposed move behavior-preserving and test-protected?
- Does it reduce coupling without creating speculative reuse?
