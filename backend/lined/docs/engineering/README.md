> Status: Active
> Applies to: Java 21 / Spring Boot 3.5.x / React 19 / TypeScript 6
> Category: Engineering Handbook Router
# Lined Engineering Quality Handbook

This is the canonical repository-local source for reuse, refactoring, ownership, patterns, and quality-gate decisions. External websites are not required.

## Mandatory workflow

Before creating a component, hook, service, helper, mapper, constant, type, interface, policy, adapter, or query-key helper:

1. Load architecture and feature/domain context.
2. Search the codebase and the Pattern Registry.
3. Classify the decision as REUSE, EXTEND, EXTRACT, or CREATE.
4. Prefer existing reuse -> simple implementation -> local extraction -> feature-local abstraction -> shared abstraction -> design pattern.
5. Protect behavior with tests, perform bounded Boy Scout work, run the Refactoring Guardian, and run mechanical gates.

## Navigation

- [Principles](principles/) — semantic DRY, locality, ownership, simplicity, and safe change.
- [Code smells](code-smells/) — signals to investigate, not automatic defects.
- [Refactorings](refactoring/) — individually retrievable transformations.
- [GoF patterns](design-patterns/gof/) — 23 patterns with applicability and anti-overengineering guidance.
- [Backend patterns](design-patterns/backend/) — patterns relevant to Spring/Lined.
- [Frontend patterns](design-patterns/frontend/) — patterns consistent with feature-first React.
- [Decision guides](decision-guides/) — practical choices before abstraction.
- [Lined Pattern Registry](registry/LINED_PATTERN_REGISTRY.md) — actual repository owners and consumers.

## Common problem lookup

| Problem | Read |
|---|---|
| Repeated implementation | code-smells/duplicate-code.md and decision-guides/reuse-vs-duplication.md |
| Repeated domain literal | code-smells/primitive-obsession.md and decision-guides/constants-and-magic-values.md |
| Large conditional | code-smells/switch-statements.md and refactoring/simplifying-conditionals/ |
| New provider behavior | design-patterns/backend/provider-adapter.md and GoF Adapter |
| Unsure where helper belongs | decision-guides/feature-local-vs-shared.md |
| Considering an interface | decision-guides/when-to-create-an-interface.md |
| Risky refactor | decision-guides/test-protected-refactoring.md |

## Tooling contract

Mechanical style belongs to Checkstyle, PMD, SpotBugs, ESLint, CPD, and jscpd. Semantic reuse and ownership belong to the workflow and Guardian. Existing legacy debt is baseline; new code must not make quality worse.

## Metadata

Catalog entries begin with lightweight metadata. Review applicability when Java, Spring Boot, React, TypeScript, or primary analysis tools materially change.
