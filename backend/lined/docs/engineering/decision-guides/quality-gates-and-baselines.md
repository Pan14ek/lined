> Status: Active
> Applies to: Java 21 / Spring Boot 3.5.x / React 19 / TypeScript 6
> Category: Decision Guide

# Quality gates and baselines

## Policy

Existing findings are baseline debt. New authored code must not make the
baseline worse. Mechanical tools are detection layers; semantic ownership and
reuse remain a human/Guardian responsibility.

## Backend commands

From `backend/lined/` run `./gradlew check`, `./gradlew pmdMain`, and
`./gradlew cpdCheck`. PMD produces XML/HTML under `build/reports/pmd/`; CPD
produces XML under `build/reports/cpd/main.xml`. Checkstyle and SpotBugs remain
the existing style/security gates.

## Frontend commands

From `lined-web/` run `npm run lint`, `npm run typecheck`,
`npm run quality:duplication`, `npm run test:run`, and `npm run build`.
`jscpd` scans authored TypeScript/TSX while excluding dependencies, build
output, generated MSW files, and shadcn-owned primitives.

## Sonar new-code duplication

Sonar uses `sonar.newCode.referenceBranch=main` and waits for the PR quality
gate. The repository-side verifier queries the PR component measure
`new_duplicated_lines_density` and fails when it exceeds `0.0` for authored
new code. Exclusions must be configured in Sonar rather than silently ignored
by local tools. If Sonar infrastructure is unavailable locally, CI is the
source of truth and the limitation belongs in the PR.

## Suppression rule

Suppressions are allowed only for demonstrable false positives, framework or
generated constraints, intentionally local literals, or intentional coupling.
They must be narrow, commented, and reviewable. Never raise a baseline silently.
