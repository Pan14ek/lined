## Purpose
<!-- Describe the goal of this PR: feature / experiment / fix / refactor -->


## Type
<!-- Check one -->
- [ ] 🧪 Experiment (fitness function research)
- [ ] ✨ Feature (new business logic)
- [ ] 🐛 Bug fix
- [ ] ♻️ Refactor / neutral change
- [ ] 📝 Documentation only

## Changes
<!-- Summarize what was changed and why -->


## Files changed
<!-- List key files and what was done to each -->

| File | Change |
|------|--------|
|  |  |

## Expected result
<!-- For experiments: fill in the fitness function prediction -->
<!-- For features: describe the expected behavior -->

| Metric | Baseline (main) | Branch | Direction |
|--------|----------------|--------|-----------|
| `checkstyle_violations` |  |  |  |
| `spotbugs_total` |  |  |  |
| `line_coverage` |  |  |  |
| `critical_violations` |  |  |  |
| `code_smells` |  |  |  |
| `duplicated_lines_density` |  |  |  |
| **F score** |  |  |  |
| **SonarQube QG** |  |  |  |

## Checklist
- [ ] `./gradlew check` passes locally
- [ ] `./gradlew jacocoTestReport` passes locally
- [ ] No unintended changes to main business logic
- [ ] Branch name matches experiment/feature naming convention

## Reuse / Abstraction Decisions

### Existing code reused
-

### Existing abstractions extended
-

### Logic extracted
-

### New abstractions introduced
-
- Why `CREATE` was necessary:

## Refactoring

### Refactoring performed
-

### Boy Scout improvements
-

### Known debt intentionally left
-
- Follow-up Beads issue(s):

## Design Patterns

### Patterns used
- Pattern:
- Applicability reason:

### Patterns considered but rejected
- Pattern:
- Why a simpler solution was preferred:

## How to use and test

| Command | Result |
|---|---|
| `./gradlew check` | |
| `./gradlew integrationTest` | |
| `./gradlew jacocoTestReport` | |
| `./gradlew pmdMain` | |
| `./gradlew cpdCheck` | |
| `npm run lint` | |
| `npm run typecheck` | |
| `npm run quality:duplication` | |
| `npm run test:run` | |
| `npm run build` | |

## Refactoring Guardian

- [ ] Guardian review completed
- Blocking findings:
- Important findings:
- Fixed:
- Justified:

## Quality Definition of Done

- [ ] Relevant CONTEXT.md files were read and ownership identified
- [ ] Search Before Create was completed and decisions classified
- [ ] Semantic/textual duplication and magic values were reviewed
- [ ] Interfaces, shared promotion, and patterns are justified
- [ ] Behavior is protected by tests; risky refactors had characterization tests
- [ ] Pattern Registry and engineering docs were updated when needed
- [ ] Backend/frontend mechanical gates passed or limitations are stated
- [ ] Sonar new-code duplication gate passed or infrastructure limitation is stated
