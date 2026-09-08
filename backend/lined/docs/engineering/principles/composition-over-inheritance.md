> Status: Active
> Applies to: Java 21 / Spring Boot 3.5.x / React 19 / TypeScript 6
> Category: Engineering Principle

# Composition over Inheritance

## Definition
Assemble behavior from collaborators when variation and ownership are clearer than a class hierarchy.

## Goal
Make the smallest correct change while keeping semantic ownership, locality, and testability visible.

## Practical signals
Inheritance becomes risky when subclasses need to suppress or reinterpret parent behavior.

## Common misuse
Do not replace a stable domain hierarchy with indirection without a concrete force.

## Do not over-apply
A principle is a decision lens, not a universal transformation. Compare ownership, change reasons, and externally visible behavior before editing structure.

## Java example
~~~java
boolean allowed = taskAccessPolicy.canRead(task, currentUserId);
~~~
A service composes a mapper and policy instead of inheriting persistence behavior.

## TypeScript example
~~~ts
const queryKey = QUERY_KEYS.lobbyTasks(lobbyId);
const { data } = useQuery({ queryKey, queryFn: () => listTasks({ lobbyId }) });
~~~
A page composes hooks and public components instead of extending a base page class.

## Interaction with Lined ownership rules
Backend behavior remains Controller -> Service -> Repository -> Entity, with policies and mappers at their existing seams. Web behavior remains feature-first, with TanStack Query for server state and public design-system wrappers for generic UI.

## Decision checklist
- What semantic responsibility is being changed?
- Which existing owner already knows this concept?
- Is the proposed move behavior-preserving and test-protected?
- Does it reduce coupling without creating speculative reuse?
