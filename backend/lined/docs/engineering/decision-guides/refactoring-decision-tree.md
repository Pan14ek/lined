> Status: Active
> Applies to: Java 21 / Spring Boot 3.5.x / React 19 / TypeScript 6
> Category: Decision Guide

# Refactoring Decision Tree

~~~text
Is there equivalent behavior?
 ├─ yes -> REUSE
 └─ no
     Is there a correct existing owner?
      ├─ yes -> EXTEND
      └─ no
          Is semantic logic repeated?
           ├─ yes -> EXTRACT
           └─ no
               Can it stay simple and local?
                ├─ yes -> keep it local
                └─ no
                    One real owner? -> feature/domain-local abstraction
                    Multiple unrelated consumers? -> consider shared abstraction
                    Recognized recurring force? -> simplest applicable pattern
~~~

At every branch, test externally meaningful behavior and record why the next branch was chosen. Equal text is not enough to justify reuse; equal responsibility is.

## What to inspect

Search the owning feature/domain, shared infrastructure, tests, context documents, and LINED_PATTERN_REGISTRY.md. Compare lifecycle, invariants, errors, data shape, and change reasons.

## Stop conditions

Stop when a direct implementation is clear, when promotion would add coupling, or when the pattern would add more concepts than it removes.

## Checklist

- [ ] Equivalent behavior ruled in or out.
- [ ] Correct owner identified.
- [ ] Semantic duplication distinguished from textual similarity.
- [ ] Feature-local versus shared decision made.
- [ ] Interface/pattern seam demonstrated.
- [ ] Characterization tests exist before risky movement.
