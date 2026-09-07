> Status: Active
> Applies to: Java 21 / Spring Boot 3.5.x / React 19 / TypeScript 6
> Category: Decision Guide

# Feature-local versus Shared

## Purpose
Keep a one-consumer abstraction local and promote only a proven domain-agnostic concept.

## How to apply
Promotion requires at least two unrelated consumers, genuine generic semantics, and lower coupling.

## Guardrails
Potential future reuse is not evidence for shared ownership.

## Backend example
A task status formatter remains in features/tasks/lib; cn is shared because it has no domain knowledge.

## Frontend example
A lobby DTO belongs to features/lobby, even if dashboard displays it.

## Decision record
Record the owner, search locations, classification (REUSE, EXTEND, EXTRACT, or CREATE), test protection, and any deferred debt in the PR.

## Checklist
- [ ] Relevant context and registry entries were read.
- [ ] Existing names, synonyms, callers, and tests were searched.
- [ ] Ownership is explicit.
- [ ] The smallest justified abstraction was chosen.
- [ ] Behavior is protected by tests.
- [ ] A pattern or shared promotion is justified, not ceremonial.
