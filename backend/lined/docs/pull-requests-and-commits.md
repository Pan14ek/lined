# Pull Requests and Commits

Use this guide before opening a pull request or splitting local changes into
commits.

## Pull Request Title

Every pull request must have a unique, specific title. The title should describe
the actual change, not only the task type.

Good examples:

- `Document backend agent routing and experiment roadmap`
- `Add backend Docker image for local experiment runs`
- `Deploy Lined backend baseline to kind`
- `Expose runtime metrics for fitness experiments`

Avoid vague titles:

- `Update docs`
- `Fix stuff`
- `Experiment`
- `Backend changes`

## Pull Request Body Template

Use this template for PR descriptions:

```markdown
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
| checkstyle_violations |  |  |  |
| spotbugs_total |  |  |  |
| line_coverage |  |  |  |
| critical_violations |  |  |  |
| code_smells |  |  |  |
| duplicated_lines_density |  |  |  |
| **F score** |  |  |  |
| **SonarQube QG** |  |  |  |

## Checklist

- [ ] ./gradlew check passes locally
- [ ] ./gradlew jacocoTestReport passes locally
- [ ] No unintended changes to main business logic
- [ ] Branch name matches experiment/feature naming convention
```

## PR Type Rules

- Use `Experiment` for research tasks that affect fitness metrics, telemetry,
  Kubernetes, load testing, runtime scenarios, or experiment tooling.
- Use `Documentation only` when no application behavior changes.
- Use `Feature` only for new product behavior.
- Use `Bug fix` only when correcting broken behavior.
- Use `Refactor / neutral change` when behavior should remain unchanged but code
  structure changes.

## Expected Result Rules

For documentation-only PRs, write `unchanged` or `neutral` in the metrics table
unless measured branch values are available.

For experiment PRs:

- Fill `Baseline (main)` when you have current main metrics.
- Fill `Branch` after CI or local tooling produces branch metrics.
- Use `Direction` to state the expected change, such as `increase`, `decrease`,
  `neutral`, or `unknown`.
- Explain any expected fitness-score trade-off in `Changes` or `Expected
  result`.

Do not invent exact metric values. Use exact values only when they come from
CI, SonarCloud, local reports, or the metrics collector.

## Commit Rules

Commits should be small, reviewable, and logically coherent.

Use one commit for one idea:

- docs routing changes
- backend architecture documentation
- test documentation
- experiment task table updates
- Dockerfile and container run docs
- Kubernetes baseline manifests
- load-test baseline scripts

Avoid mixing unrelated work in one commit:

- documentation plus business logic
- Kubernetes manifests plus Java refactoring
- test rewrites plus telemetry collector changes
- formatting-only changes plus feature behavior

## Commit Message Style

Use short imperative commit messages:

- `Add backend PR and commit guide`
- `Document backend testing conventions`
- `Move backend API docs into docs index`
- `Add experiment task roadmap`

Keep the subject line specific. If a commit needs more context, add a short
body explaining why the change exists and what should be reviewed.

## Before Opening a PR

- Check that the branch name matches the task, for example
  `experiment/backend-docs-foundation`.
- Confirm the PR title is unique and specific.
- Fill the PR body instead of leaving template comments as the only content.
- Keep unchecked checklist items unchecked if they were not actually run.
- Mention documentation-only PRs explicitly when runtime behavior is unchanged.
