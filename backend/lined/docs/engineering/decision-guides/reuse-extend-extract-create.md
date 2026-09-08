> Status: Active
> Applies to: Java 21 / Spring Boot 3.5.x / React 19 / TypeScript 6
> Category: Decision Guide

# REUSE / EXTEND / EXTRACT / CREATE

## Purpose
Classify every meaningful abstraction decision so reuse and new ownership are reviewable.

## How to apply
REUSE uses a suitable owner; EXTEND adds capability to that owner; EXTRACT centralizes repeated semantic logic; CREATE records why no owner fits.

## Guardrails
CREATE requires a concrete absence of a suitable owner, not a preference for a new name.

## Backend example
Existing backend policies are extended for related authorization; a new provider seam is created only for a real external boundary.

## Frontend example
A feature hook is extended before creating a shared hook; promotion needs unrelated real consumers.

## Decision record
Record the owner, search locations, classification (REUSE, EXTEND, EXTRACT, or CREATE), test protection, and any deferred debt in the PR.

## Checklist
- [ ] Relevant context and registry entries were read.
- [ ] Existing names, synonyms, callers, and tests were searched.
- [ ] Ownership is explicit.
- [ ] The smallest justified abstraction was chosen.
- [ ] Behavior is protected by tests.
- [ ] A pattern or shared promotion is justified, not ceremonial.
