---
name: lined-code-quality
description: Apply the Lined engineering-quality workflow before web changes that add shared components, hooks, API helpers, abstractions, refactors, or patterns.
---

# Lined web code-quality workflow

Use this thin procedure; canonical theory is in `../backend/lined/docs/engineering/`.

1. Read root and web `AGENTS.md`, `docs/ARCHITECTURE.md`,
   `docs/PROJECT_STRUCTURE.md`, the affected feature `CONTEXT.md`, and the
   relevant engineering decision guide.
2. Identify feature ownership, model/API state, shared UI boundaries, and real
   cross-feature dependencies.
3. Search exact names, synonyms, callers, tests, Storybook, shared hooks,
   public components, API prod/dev implementations, and the Pattern Registry.
4. Record `REUSE`, `EXTEND`, `EXTRACT`, or `CREATE`; justify every CREATE.
5. Review only relevant smells, especially duplicate code, primitive obsession,
   switch statements, feature envy, shotgun surgery, middle man, and
   speculative generality.
6. Add behavior/interaction/cache characterization tests before risky movement.
7. Prefer existing reuse -> simple code -> local extraction -> feature-local
   abstraction -> shared abstraction -> pattern. Keep server state in Query and
   UI state in the correct local/store owner.
8. Perform bounded Boy Scout cleanup in the touched feature only.
9. Self-review ownership, semantic duplication, protocol literals, shared
   promotion, interfaces, patterns, docs, registry, and deferred debt.
10. Run the read-only Refactoring Guardian and resolve meaningful findings as
    FIXED or JUSTIFIED. Run `npm run lint`, `npm run typecheck`,
    `npm run quality:duplication`, `npm run test:run`, and `npm run build`.

Do not edit `src/components/ui/` directly. The Guardian never edits code and
this workflow does not authorize repository-wide cleanup.
