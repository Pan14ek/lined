> Status: Active
> Applies to: Java 21 / Spring Boot 3.5.x / React 19 / TypeScript 6
> Category: Shared Design Pattern Guidance

# Gang of Four Patterns

These are the shared GoF design-pattern references for the Lined monorepo.
They provide a common vocabulary for backend and web work; they do not imply
that every pattern should be introduced into the codebase.

Use the applicability and anti-overengineering guidance in each reference
before choosing a pattern. Prefer the simplest design that makes the domain
boundary, variation point, or collaboration explicit.

## Creational patterns

- [Abstract Factory](creational/abstract-factory.md)
- [Builder](creational/builder.md)
- [Factory Method](creational/factory-method.md)
- [Prototype](creational/prototype.md)
- [Singleton](creational/singleton.md)

## Structural patterns

- [Adapter](structural/adapter.md)
- [Bridge](structural/bridge.md)
- [Composite](structural/composite.md)
- [Decorator](structural/decorator.md)
- [Facade](structural/facade.md)
- [Flyweight](structural/flyweight.md)
- [Proxy](structural/proxy.md)

## Behavioral patterns

- [Chain of Responsibility](behavioral/chain-of-responsibility.md)
- [Command](behavioral/command.md)
- [Interpreter](behavioral/interpreter.md)
- [Iterator](behavioral/iterator.md)
- [Mediator](behavioral/mediator.md)
- [Memento](behavioral/memento.md)
- [Observer](behavioral/observer.md)
- [State](behavioral/state.md)
- [Strategy](behavioral/strategy.md)
- [Template Method](behavioral/template-method.md)
- [Visitor](behavioral/visitor.md)

For Lined-specific ownership and real consumers, see the [Lined Pattern
Registry](../../registry/LINED_PATTERN_REGISTRY.md).
