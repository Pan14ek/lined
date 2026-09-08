> Status: Active
> Applies to: React 19 / TypeScript 6
> Category: Web Engineering Handbook Router
# Lined Web Engineering Handbook

This is the web-owned source for React and TypeScript engineering guidance.
Cross-project vocabulary lives in the [shared Lined engineering handbook](../../../docs/engineering/README.md); Spring-specific guidance lives in the [backend engineering handbook](../../../backend/lined/docs/engineering/README.md).

## Navigation

- [Web design patterns](design-patterns/) — patterns consistent with the feature-first React application.
- [Shared GoF patterns](../../../docs/engineering/design-patterns/gof/README.md) — cross-project design vocabulary.
- [Shared Lined Pattern Registry](../../../docs/engineering/registry/LINED_PATTERN_REGISTRY.md) — actual backend and web owners and consumers.
- [UI component context](../../src/components/CONTEXT.md) — public Design System and patterns ownership.
- [Web architecture](../../docs/ARCHITECTURE.md) — feature-first structure and dependency direction.

## Ownership rule

Keep React/TypeScript patterns here when they describe web interfaces,
feature-first organization, client state, or browser behavior. Keep domain
wrappers with their owning feature. Promote a composition into
`src/components/patterns/` only after the second unrelated web use case.

## Maintenance

Update this index and `lined-web/AGENTS.md` when web guidance is added, moved,
or renamed. Keep the pattern documents self-contained and aligned with the
Design System and feature contexts.
