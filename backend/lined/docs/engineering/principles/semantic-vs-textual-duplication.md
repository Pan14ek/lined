> Status: Active
> Applies to: Java 21 / Spring Boot 3.5.x / React 19 / TypeScript 6
> Category: Engineering Principle

# Semantic versus Textual Duplication

## Definition
Treat duplicated responsibility as the primary risk and matching syntax as supporting evidence.

## Goal
Make the smallest correct change while keeping semantic ownership, locality, and testability visible.

## Practical signals
Two different implementations of the same invariant are semantic duplication.

## Common misuse
Identical values can be independent concepts and should remain separate when ownership differs.

## Do not over-apply
A principle is a decision lens, not a universal transformation. Compare ownership, change reasons, and externally visible behavior before editing structure.

## Java example
~~~java
boolean allowed = taskAccessPolicy.canRead(task, currentUserId);
~~~
A repeated 404 in protocol assertions is a candidate for a shared status constant; repeated business rules require owner analysis.

## TypeScript example
~~~ts
const queryKey = QUERY_KEYS.lobbyTasks(lobbyId);
const { data } = useQuery({ queryKey, queryFn: () => listTasks({ lobbyId }) });
~~~
A copied TaskDto is semantic duplication even if formatting differs; repeated fixture titles may be harmless.

## Interaction with Lined ownership rules
Backend behavior remains Controller -> Service -> Repository -> Entity, with policies and mappers at their existing seams. Web behavior remains feature-first, with TanStack Query for server state and public design-system wrappers for generic UI.

## Decision checklist
- What semantic responsibility is being changed?
- Which existing owner already knows this concept?
- Is the proposed move behavior-preserving and test-protected?
- Does it reduce coupling without creating speculative reuse?
