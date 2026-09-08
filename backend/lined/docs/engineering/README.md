> Status: Active
> Applies to: Java 21 / Spring Boot 3.5.x
> Category: Backend Engineering Handbook Router
# Lined Backend Engineering Quality Handbook

This is the backend-owned source for Spring/Lined reuse, refactoring, and quality-gate decisions. Cross-project guidance is owned by the [shared Lined engineering handbook](../../../../docs/engineering/README.md); web-specific pattern guidance is owned by the [lined-web engineering handbook](../../../../lined-web/docs/engineering/README.md).

## Mandatory workflow

Before creating a backend abstraction, service, helper, mapper, constant, type, interface, policy, adapter, or query helper:

1. Load architecture and feature/domain context.
2. Search the codebase and the Pattern Registry.
3. Classify the decision as REUSE, EXTEND, EXTRACT, or CREATE.
4. Prefer existing reuse -> simple implementation -> local extraction -> feature-local abstraction -> shared abstraction -> design pattern.
5. Protect behavior with tests, perform bounded Boy Scout work, run the Refactoring Guardian, and run mechanical gates.

## Navigation

- [Principles](principles/) — semantic DRY, locality, ownership, simplicity, and safe change.
- [Code smells](code-smells/) — signals to investigate, not automatic defects.
- [Refactorings](refactoring/) — individually retrievable transformations.
- [Backend patterns](design-patterns/backend/) — patterns relevant to Spring/Lined.
- [Decision guides](decision-guides/) — practical choices before abstraction.
- [Shared GoF patterns](../../../../docs/engineering/design-patterns/gof/) — cross-project vocabulary with applicability and anti-overengineering guidance.
- [Shared Lined Pattern Registry](../../../../docs/engineering/registry/LINED_PATTERN_REGISTRY.md) — actual backend and web owners and consumers.
- [Web patterns](../../../../lined-web/docs/engineering/design-patterns/) — patterns consistent with feature-first React.

## Common problem lookup

| Problem | Read |
|---|---|
| Repeated implementation | code-smells/duplicate-code.md and decision-guides/reuse-vs-duplication.md |
| Repeated domain literal | code-smells/primitive-obsession.md and decision-guides/constants-and-magic-values.md |
| Large conditional | code-smells/switch-statements.md and refactoring/simplifying-conditionals/ |
| New provider behavior | design-patterns/backend/provider-adapter.md and [shared GoF Adapter](../../../../docs/engineering/design-patterns/gof/structural/adapter.md) |
| Unsure where helper belongs | decision-guides/feature-local-vs-shared.md |
| Considering an interface | decision-guides/when-to-create-an-interface.md |
| Risky refactor | decision-guides/test-protected-refactoring.md |

## Tooling contract

Mechanical style belongs to Checkstyle, PMD, SpotBugs, ESLint, CPD, and jscpd. Semantic reuse and ownership belong to the workflow and Guardian. Existing legacy debt is baseline; new code must not make quality worse.

## Metadata

Catalog entries begin with lightweight metadata. Review applicability when Java, Spring Boot, React, TypeScript, or primary analysis tools materially change.
