> Status: Active
> Applies to: Java 21 / Spring Boot 3.5.x / React 19 / TypeScript 6
> Category: Engineering Principle

# Cohesion and Coupling

## Definition
Keep related decisions together and minimize unnecessary knowledge between owners.

## Goal
Make the smallest correct change while keeping semantic ownership, locality, and testability visible.

## Practical signals
If changing one rule requires edits across unrelated features, coupling or ownership is wrong.

## Common misuse
Do not force unrelated concepts into a shared module merely to reduce imports.

## Do not over-apply
A principle is a decision lens, not a universal transformation. Compare ownership, change reasons, and externally visible behavior before editing structure.

## Java example
~~~java
boolean allowed = taskAccessPolicy.canRead(task, currentUserId);
~~~
Task privacy belongs beside task access policy, not in a generic ACL utility.

## TypeScript example
~~~ts
const queryKey = QUERY_KEYS.lobbyTasks(lobbyId);
const { data } = useQuery({ queryKey, queryFn: () => listTasks({ lobbyId }) });
~~~
A feature may import another feature's model when the dependency is real; duplicating the model is worse.

## Interaction with Lined ownership rules
Backend behavior remains Controller -> Service -> Repository -> Entity, with policies and mappers at their existing seams. Web behavior remains feature-first, with TanStack Query for server state and public design-system wrappers for generic UI.

## Decision checklist
- What semantic responsibility is being changed?
- Which existing owner already knows this concept?
- Is the proposed move behavior-preserving and test-protected?
- Does it reduce coupling without creating speculative reuse?
