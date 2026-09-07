> Status: Active
> Applies to: Java 21 / Spring Boot 3.5.x / React 19 / TypeScript 6
> Category: Decision Guide

# Constants and Magic Values

## Purpose
Name values that carry domain or operational meaning and keep them at the correct owner.

## How to apply
Prefer framework constants, typed values, named constants, then configuration when operationally changeable.

## Guardrails
Do not name obvious loop indexes or unrelated fixture values; equal values may be different concepts.

## Backend example
Use Spring HttpStatus and typed configuration for backend protocol and operational values.

## Frontend example
Use one project-owned HTTP status abstraction for protocol semantics; keep feature labels and fixture values local.

## Decision record
Record the owner, search locations, classification (REUSE, EXTEND, EXTRACT, or CREATE), test protection, and any deferred debt in the PR.

## Checklist
- [ ] Relevant context and registry entries were read.
- [ ] Existing names, synonyms, callers, and tests were searched.
- [ ] Ownership is explicit.
- [ ] The smallest justified abstraction was chosen.
- [ ] Behavior is protected by tests.
- [ ] A pattern or shared promotion is justified, not ceremonial.
