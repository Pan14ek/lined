> Status: Active
> Applies to: Java 21 / Spring Boot 3.5.x / React 19 / TypeScript 6
> Category: Engineering Principle

# Locality and Ownership

## Definition
A change should be discoverable near the concept that owns its behavior.

## Goal
Make the smallest correct change while keeping semantic ownership, locality, and testability visible.

## Practical signals
Scattered validation, mapping, and authorization are costly even when each piece is small.

## Common misuse
Do not centralize a concept that has only one real owner.

## Do not over-apply
A principle is a decision lens, not a universal transformation. Compare ownership, change reasons, and externally visible behavior before editing structure.

## Java example
~~~java
boolean allowed = taskAccessPolicy.canRead(task, currentUserId);
~~~
The task feature owns task status semantics; common owns only domain-neutral lookup mechanics.

## TypeScript example
~~~ts
const queryKey = QUERY_KEYS.lobbyTasks(lobbyId);
const { data } = useQuery({ queryKey, queryFn: () => listTasks({ lobbyId }) });
~~~
The users feature owns UserDto; consumers import it rather than cloning the shape.

## Interaction with Lined ownership rules
Backend behavior remains Controller -> Service -> Repository -> Entity, with policies and mappers at their existing seams. Web behavior remains feature-first, with TanStack Query for server state and public design-system wrappers for generic UI.

## Decision checklist
- What semantic responsibility is being changed?
- Which existing owner already knows this concept?
- Is the proposed move behavior-preserving and test-protected?
- Does it reduce coupling without creating speculative reuse?
