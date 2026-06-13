# Experiment Results Reporting

This guide describes the article-evidence reporting workflow for
`experiment/experiment-results-reporting`.

The workflow is additive. It reads explicit experiment artifacts and produces
tables, plots, provenance, and narrative-ready sections for Results,
Discussion, and Limitations. It does not run Kubernetes, run k6, query Cosmos
DB, change backend behavior, or redefine any score.

## Scope

This task provides:

- a dependency-free Node CLI for local report generation;
- batch inputs for collector metrics documents and runtime-summary artifacts;
- CSV tables for score lanes, runtime summaries, Pareto candidates,
  decision-usefulness rows, and evidence provenance;
- SVG plots for score lanes and runtime latency;
- a Markdown report split into Results, Discussion, and Limitations /
  Threats to Validity;
- a `results-report.json` provenance index that records included and excluded
  evidence.

This task does not generate new empirical measurements, create a CI gate,
change collector score semantics, change the runtime-summary schema, or add
backend API behavior.

## Inputs

Run the CLI from the backend checkout root:

```bash
node load-tests/runtime-scenarios/experiment-results-report-cli.mjs \
  --metrics-json /absolute/path/metrics-document-a.json \
  --metrics-json /absolute/path/metrics-document-b.json \
  --runtime-summary /absolute/path/fixed-medium/runtime-summary.json \
  --runtime-summary /absolute/path/replicas-2/runtime-summary.json \
  --runtime-summary /absolute/path/hpa-cpu/runtime-summary.json \
  --runtime-manifest /absolute/path/failed-run/runtime-summary-manifest.json \
  --output-dir /absolute/path/results-report
```

`--metrics-json`, `--runtime-summary`, and `--runtime-manifest` are
repeatable. At least one evidence artifact is required.

`--runtime-manifest` is provenance only. Manifest artifacts are always recorded
as excluded evidence because `runtime-summary-manifest.json` is not collector
input. A manifest with `collector_summary_written: false` is reported as a
failed or incomplete run instead of being summarized as clean evidence.

## How To Use And Test

Use this workflow after scenario runs and collector scoring have already
produced evidence artifacts. First, gather the collector metrics documents that
contain the score lanes you want to report and the `runtime-summary.json`
files for the deployment scenarios being compared. Include matching
`runtime-summary-manifest.json` files when fixture-profile provenance or failed
run context should be visible in the report. Then run
`experiment-results-report-cli.mjs` with repeated `--metrics-json`,
`--runtime-summary`, and optional `--runtime-manifest` arguments, pointing
`--output-dir` at a disposable report directory. Review `results-summary.md`
for the article-facing Results, Discussion, and Limitations text; inspect
`results-report.json` and `evidence.csv` to confirm each included or excluded
artifact has the expected scenario, workload, source, fixture profile, and
exclusion reason. Validate code changes with the Node test suite and syntax
checks listed in the Validation section before using the output as paper
evidence.

## Canonical Comparison Set

The canonical article comparison set is:

| Scenario | Workload | Source |
|----------|----------|--------|
| `fixed-medium` | same workload across all scenarios | same source across all scenarios |
| `replicas-2` | same workload across all scenarios | same source across all scenarios |
| `hpa-cpu` | same workload across all scenarios | same source across all scenarios |

The report records whether this set is available. Missing scenarios, mixed
workloads, or mixed sources are listed in `results-report.json` and the
Limitations section.

Metrics documents should contain the current runtime identity under
`runtimeFitness.current` so structural, runtime-aware, adaptive, Pareto, and
decision-usefulness evidence can be traced to `scenario:workload:source`.

## Evidence Rules

The report preserves score lanes separately:

| Lane | Field |
|------|-------|
| Structural fitness | `fitnessScore` |
| Runtime-aware scalar fitness | `runtimeFitnessScore` |
| Adaptive weighted fitness | `adaptiveFitnessScore` |
| Pareto comparison | `paretoOptimization` |
| Decision usefulness | `decisionUsefulness` |

Runtime summaries must include `scenario`, `workload`, `source`, and
`summary`. Candidate identity is `scenario:workload:source`. Duplicate
runtime or metrics identities are excluded so tables do not double-count a
deployment variant.

The report does not infer `availability` from `error_rate`. If availability,
CPU utilization, memory utilization, readiness, or any other metric is absent,
the metric remains missing and is listed in limitations. This keeps incomplete
local evidence out of article claims.

The report excludes:

- runtime summaries or metrics documents without scenario/workload/source
  identity;
- duplicate candidate identities;
- manifest-only evidence;
- failed or incomplete runs identified by `collector_summary_written: false`;
- metrics documents with no score, Pareto, or decision-usefulness lane.

Excluded artifacts remain visible in `results-report.json`, `evidence.csv`,
and the Markdown Limitations section with an explicit exclusion reason.

## Outputs

The output directory contains:

| File | Purpose |
|------|---------|
| `results-summary.md` | Article-ready Results, Discussion, and Limitations sections. |
| `results-report.json` | Provenance index and structured report data. |
| `score-lanes.csv` | Structural, runtime-aware, and adaptive score rows. |
| `runtime-summaries.csv` | Included runtime-summary metrics and missing fields. |
| `pareto-candidates.csv` | Pareto candidate rank, selection, and objective metadata. |
| `decision-usefulness.csv` | Candidate-level scalar-vs-Pareto trade-off rows. |
| `evidence.csv` | Included and excluded evidence artifacts with reasons. |
| `score-lanes.svg` | Dependency-free score lane plot. |
| `runtime-latency.svg` | Dependency-free p95 latency plot. |

Use `results-summary.md` as the starting point for paper drafting, but keep
the CSV and JSON files with the article evidence so reviewers can trace every
claim back to explicit input artifacts.

`results-report.json` is also the evidence boundary consumed by
`docs/llm-tradeoff-explanations.md` when generating reviewed explanation
drafts for Pareto and decision-usefulness comparisons.

## Article Use

The Results section is limited to supplied evidence: score rows, runtime
summary rows, Pareto rows, and decision-usefulness rows. The Discussion section
can compare scalar, adaptive, and Pareto interpretations, but it must not claim
improvement unless the supplied metrics documents support that claim.

The Limitations / Threats to Validity section is part of the required output.
It should be preserved in article drafts because local kind evidence, missing
metrics, omitted objectives, and excluded failed runs materially affect how the
experiment can be interpreted.

## Validation

Run the report tests and syntax checks:

```bash
node --test load-tests/runtime-scenarios/*.test.mjs
node --check load-tests/runtime-scenarios/experiment-results-report.mjs
node --check load-tests/runtime-scenarios/experiment-results-report-cli.mjs
git diff --check
```
