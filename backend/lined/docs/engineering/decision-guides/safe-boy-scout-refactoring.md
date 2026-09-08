> Status: Active
> Applies to: Java 21 / Spring Boot 3.5.x / React 19 / TypeScript 6
> Category: Decision Guide

# Safe Boy Scout Refactoring

## Purpose
Bounded cleanup is allowed when directly related, behavior-preserving, tested, and easy to review.

## How to apply
Define the touched concept, establish a test safety net, make one transformation, rerun checks, and document it.

## Guardrails
Do not hide broad cleanup under a quality-system PR.

## Backend example
Extract a repeated authorization predicate only in the feature being changed.

## Frontend example
Consolidate a duplicated cache update when the same hook flow is under change.

## Decision record
Record the owner, search locations, classification (REUSE, EXTEND, EXTRACT, or CREATE), test protection, and any deferred debt in the PR.

## Checklist
- [ ] Relevant context and registry entries were read.
- [ ] Existing names, synonyms, callers, and tests were searched.
- [ ] Ownership is explicit.
- [ ] The smallest justified abstraction was chosen.
- [ ] Behavior is protected by tests.
- [ ] A pattern or shared promotion is justified, not ceremonial.
