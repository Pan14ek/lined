> Status: Active
> Applies to: Java 21 / Spring Boot 3.5.x / React 19 / TypeScript 6
> Category: Decision Guide

# Reuse versus Duplication

## Purpose
Decide whether reuse reduces semantic duplication without creating harmful coupling.

## How to apply
Compare responsibility, invariants, lifecycle, change reasons, and ownership—not only identical lines.

## Guardrails
Textual reuse can be a regression if it couples unrelated domains.

## Backend example
Reuse EntityFinder for lookup failure semantics but keep domain-specific not-found messages in the service.

## Frontend example
Reuse public Badge geometry through a feature wrapper; do not duplicate design-system markup.

## Decision record
Record the owner, search locations, classification (REUSE, EXTEND, EXTRACT, or CREATE), test protection, and any deferred debt in the PR.

## Checklist
- [ ] Relevant context and registry entries were read.
- [ ] Existing names, synonyms, callers, and tests were searched.
- [ ] Ownership is explicit.
- [ ] The smallest justified abstraction was chosen.
- [ ] Behavior is protected by tests.
- [ ] A pattern or shared promotion is justified, not ceremonial.
