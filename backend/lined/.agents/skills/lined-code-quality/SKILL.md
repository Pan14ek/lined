---
name: lined-code-quality
description: Apply the Lined engineering-quality workflow before backend changes that add abstractions, move responsibilities, refactor behavior, or introduce patterns.
---

# Lined backend code-quality workflow

Use this thin procedure; the canonical theory is under `docs/engineering/`.

1. Read the root and backend `AGENTS.md`, `docs/README.md`, `docs/CONTEXT.md`,
   affected feature context files, and the relevant engineering decision guide.
2. Identify the domain owner, model, existing shared seams, and cross-domain
   dependencies before editing.
3. Search exact names, synonyms, callers, tests, and
   `docs/engineering/registry/LINED_PATTERN_REGISTRY.md`.
4. Record the reuse map as `REUSE`, `EXTEND`, `EXTRACT`, or `CREATE`. A CREATE
   decision must state why no suitable owner exists.
5. Review only relevant smells: duplicate code, primitive obsession, long
   method/parameter list, data clumps, switch statements, feature envy,
   shotgun surgery, middle man, and speculative generality.
6. Add characterization/regression tests before behavior-sensitive movement.
7. Use the smallest justified design: reuse -> simple code -> local extraction
   -> feature-local abstraction -> shared abstraction -> pattern.
8. Perform a bounded, test-protected Boy Scout pass in the touched concept.
9. Self-review ownership, semantic duplication, literals, interfaces, pattern
   ceremony, registry/docs updates, and deferred debt.
10. Run the read-only Refactoring Guardian, resolve every meaningful finding as
    FIXED or JUSTIFIED, then run `./gradlew check`, `./gradlew integrationTest`,
    `./gradlew jacocoTestReport`, and the relevant PMD/CPD commands.

The Guardian never edits production code. Do not broaden this workflow into a
repository-wide cleanup; record unrelated debt as follow-up work.
