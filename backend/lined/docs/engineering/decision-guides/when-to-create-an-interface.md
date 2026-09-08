> Status: Active
> Applies to: Java 21 / Spring Boot 3.5.x / React 19 / TypeScript 6
> Category: Decision Guide

# When to Create an Interface

## Purpose
Create an interface when a real seam, multiple adapters, external provider, or stable contract earns it.

## How to apply
Count real implementations and meaningful substitution needs; inspect framework and domain boundaries.

## Guardrails
Do not add an interface for a single class merely to look testable or future-proof.

## Backend example
The CurrentUserProvider is a real security seam; a one-off formatter interface would be speculative.

## Frontend example
TypeScript interfaces are useful for stable data contracts, not as wrappers around every function.

## Decision record
Record the owner, search locations, classification (REUSE, EXTEND, EXTRACT, or CREATE), test protection, and any deferred debt in the PR.

## Checklist
- [ ] Relevant context and registry entries were read.
- [ ] Existing names, synonyms, callers, and tests were searched.
- [ ] Ownership is explicit.
- [ ] The smallest justified abstraction was chosen.
- [ ] Behavior is protected by tests.
- [ ] A pattern or shared promotion is justified, not ceremonial.
