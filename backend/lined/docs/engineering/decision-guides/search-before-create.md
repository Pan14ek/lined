> Status: Active
> Applies to: Java 21 / Spring Boot 3.5.x / React 19 / TypeScript 6
> Category: Decision Guide

# Search Before Create

## Purpose
Discovery precedes design. Search names, synonyms, owners, registries, and tests before adding an abstraction.

## How to apply
Search the relevant feature/domain first, then shared infrastructure and the Pattern Registry; inspect callers before choosing an owner.

## Guardrails
A search result is evidence, not an automatic reuse decision: verify semantics and ownership.

## Backend example
If an existing task query-key factory satisfies the need, reuse it; do not add a second cache-key helper.

## Frontend example
Use the decision record REUSE, EXTEND, EXTRACT, or CREATE in the PR.

## Decision record
Record the owner, search locations, classification (REUSE, EXTEND, EXTRACT, or CREATE), test protection, and any deferred debt in the PR.

## Checklist
- [ ] Relevant context and registry entries were read.
- [ ] Existing names, synonyms, callers, and tests were searched.
- [ ] Ownership is explicit.
- [ ] The smallest justified abstraction was chosen.
- [ ] Behavior is protected by tests.
- [ ] A pattern or shared promotion is justified, not ceremonial.
