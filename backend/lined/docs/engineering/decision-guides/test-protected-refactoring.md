> Status: Active
> Applies to: Java 21 / Spring Boot 3.5.x / React 19 / TypeScript 6
> Category: Decision Guide

# Test-Protected Refactoring

## Purpose
Use a red/green loop around behavior-sensitive structural changes.

## How to apply
Observe behavior, add characterization tests, refactor in small steps, and rerun tests after each meaningful step.

## Guardrails
A test that asserts private call order is not sufficient protection.

## Backend example
Prefer service, authorization, persistence, and API contract tests.

## Frontend example
Prefer user-visible UI, hook cache, error-state, and MSW interaction tests.

## Decision record
Record the owner, search locations, classification (REUSE, EXTEND, EXTRACT, or CREATE), test protection, and any deferred debt in the PR.

## Checklist
- [ ] Relevant context and registry entries were read.
- [ ] Existing names, synonyms, callers, and tests were searched.
- [ ] Ownership is explicit.
- [ ] The smallest justified abstraction was chosen.
- [ ] Behavior is protected by tests.
- [ ] A pattern or shared promotion is justified, not ceremonial.
