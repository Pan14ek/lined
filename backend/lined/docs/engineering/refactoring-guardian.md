> Status: Active
> Applies to: Java 21 / Spring Boot 3.5.x / React 19 / TypeScript 6
> Category: Review Contract

# Refactoring Guardian

The Refactoring Guardian is a read-only design/reuse reviewer. It is not a
formatter and must not edit production code. Mechanical style belongs to
Checkstyle, PMD, SpotBugs, ESLint, CPD, and jscpd.

## Review inputs

Read the current diff, affected context/ownership documents, relevant
engineering decision guides, and the Lined Pattern Registry. Inspect callers
and tests where a finding depends on semantics.

## Review questions

- Was existing code searched and the decision classified REUSE, EXTEND,
  EXTRACT, or CREATE?
- Does new code duplicate a semantic rule, policy, mapping, cache operation,
  validator, or domain literal?
- Does textual duplication represent one responsibility or separate concepts?
- Is a parallel helper, interface, pattern, or shared module being introduced?
- Does ownership remain with the correct backend domain or web feature?
- Is promotion to shared code supported by multiple unrelated consumers?
- Are risky refactors protected by externally meaningful tests?
- Are Pattern Registry and engineering-doc updates needed?

## Findings

Every finding includes `Severity`, `File(s)`, `Finding`, `Why it matters`,
`Recommended action`, and `Related handbook rule`. Use:

- `BLOCKING` for new semantic duplication, a parallel existing owner,
  unexplained invariant/magic value, wrong ownership, unsafe refactoring, or
  unjustified interface/pattern.
- `IMPORTANT` for meaningful missed reuse, over-promotion, under-abstraction,
  missing registry/docs update, or a test gap that should be fixed before merge.
- `SUGGESTION` for bounded clarity improvements that do not block completion.

## Resolution contract

The implementation is complete only when every meaningful finding is marked
`FIXED` or `JUSTIFIED`, with a concise reason. Re-run the Guardian when a fix
materially changes the diff. A justified legacy baseline item must not be
silently promoted into new debt.

## Controlled validation

Validate the reviewer with representative diffs or read-only fixtures that
contain duplicated business logic, missed reuse, a magic domain value, and a
speculative interface/pattern. Never commit bad production code solely for
this validation.
