> Status: Active
> Applies to: Java 21 / Spring Boot 3.5.x / React 19 / TypeScript 6
> Category: Decision Guide

# When to Use a Design Pattern

## Purpose
Use a named pattern only when it solves a recurring design force better than a simpler local design.

## How to apply
Name the problem, alternatives rejected, concrete collaborators, and test seam.

## Guardrails
Pattern vocabulary must not replace domain understanding or justify ceremony.

## Backend example
A provider adapter can isolate external semantics; a factory is unnecessary for one constructor.

## Frontend example
A small query-key object is a local factory-like helper, not automatically a GoF Factory.

## Decision record
Record the owner, search locations, classification (REUSE, EXTEND, EXTRACT, or CREATE), test protection, and any deferred debt in the PR.

## Checklist
- [ ] Relevant context and registry entries were read.
- [ ] Existing names, synonyms, callers, and tests were searched.
- [ ] Ownership is explicit.
- [ ] The smallest justified abstraction was chosen.
- [ ] Behavior is protected by tests.
- [ ] A pattern or shared promotion is justified, not ceremonial.
