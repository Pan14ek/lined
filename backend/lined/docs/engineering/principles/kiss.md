> Status: Active
> Applies to: Java 21 / Spring Boot 3.5.x / React 19 / TypeScript 6
> Category: Engineering Principle

# KISS

## Definition
Choose the smallest design that makes the requirement clear and correct.

## Goal
Make the smallest correct change while keeping semantic ownership, locality, and testability visible.

## Practical signals
A direct service method is preferable when no variation or seam exists.

## Common misuse
Do not use simplicity to hide repeated business rules or avoid a needed policy.

## Do not over-apply
A principle is a decision lens, not a universal transformation. Compare ownership, change reasons, and externally visible behavior before editing structure.

## Java example
~~~java
boolean allowed = taskAccessPolicy.canRead(task, currentUserId);
~~~
A controller delegating to one service call is simple because ownership is explicit.

## TypeScript example
~~~ts
const queryKey = QUERY_KEYS.lobbyTasks(lobbyId);
const { data } = useQuery({ queryKey, queryFn: () => listTasks({ lobbyId }) });
~~~
A React page composed from existing design-system components is simpler than a new layout abstraction.

## Interaction with Lined ownership rules
Backend behavior remains Controller -> Service -> Repository -> Entity, with policies and mappers at their existing seams. Web behavior remains feature-first, with TanStack Query for server state and public design-system wrappers for generic UI.

## Decision checklist
- What semantic responsibility is being changed?
- Which existing owner already knows this concept?
- Is the proposed move behavior-preserving and test-protected?
- Does it reduce coupling without creating speculative reuse?
