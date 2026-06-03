# Runtime-Aware Scoring

This guide describes the runtime-aware scoring contract for
`experiment/runtime-aware-scoring`.

Runtime-aware scoring is additive. It keeps the existing top-level
`fitnessScore` as the structural CI score and adds a separate versioned score
from summarized runtime evidence.

## Scope

This task provides:

- a versioned scalar runtime score named `runtimeFitnessScore`;
- local scoring from explicit current and baseline runtime summary files;
- optional persisted baseline lookup through the collector metrics-store seam;
- SLO constraint classification from `slo-thresholds-v1.json`;
- optional local output when Cosmos DB or another metrics database is not
  configured.

This task does not add adaptive weighting, Pareto optimization, new backend
API behavior, production SLOs, dashboarding, or live telemetry scraping inside
the collector.

## Collector Inputs

The collector accepts current runtime evidence through the existing input:

```text
RUNTIME_METRICS_JSON=/absolute/path/to/runtime-summary.json
```

For local/offline scoring, pass an explicit baseline summary:

```text
RUNTIME_BASELINE_METRICS_JSON=/absolute/path/to/baseline-runtime-summary.json
```

When a metrics store is configured and no explicit baseline file is provided,
the collector can look for the latest persisted `main` runtime summary matching
the configured baseline scenario and current workload:

```text
RUNTIME_BASELINE_SCENARIO=fixed-medium
```

The default threshold artifact is:

```text
SLO_THRESHOLDS_JSON=../backend/lined/load-tests/runtime-scenarios/slo-thresholds-v1.json
```

When no database is configured, write the final document locally:

```text
METRICS_OUTPUT_JSON=/absolute/path/to/metrics-document.json
```

For a runtime-only local smoke check without structural CI reports or
SonarCloud access, use:

```text
RUNTIME_ONLY=true
```

The default collector path still reads Checkstyle, SpotBugs, JaCoCo, and
SonarCloud evidence. `RUNTIME_ONLY=true` is only for local runtime scoring
experiments where the structural CI score is not being recomputed.

## Output Contract

The stored or local metrics document preserves the structural score:

```json
{
  "fitnessScore": 0.1234,
  "runtimeFitnessScore": 0.2185,
  "runtimeFitnessScoreVersion": "runtime-aware-v1",
  "runtimeFitness": {
    "current": {
      "scenario": "replicas-2",
      "workload": "baseline",
      "source": "local-kind"
    },
    "baseline": {
      "scenario": "fixed-medium",
      "workload": "baseline",
      "source": "local-kind"
    },
    "eligibleForStableComparison": false
  }
}
```

`fitnessScore` remains the CI-only structural score. Runtime evidence is
attached under `metrics.runtime_metrics`; runtime score metadata is attached
under `runtimeFitness`.

When `RUNTIME_ONLY=true`, the output document may contain
`fitnessScore: null` because no structural CI evidence was collected. That
does not redefine the field; it records that the runtime-only smoke path did
not compute the structural score.

## Runtime-Aware v1 Formula

The score compares current runtime summary metrics against a baseline runtime
summary. Each metric is normalized to `[-1, 1]` before weighting.

Lower-is-better metrics use:

```text
(baseline - current) / baseline
```

Higher-is-better metrics use:

```text
(current - baseline) / baseline
```

If baseline and current are both zero, the normalized delta is `0`. If baseline
is zero and current is non-zero, beneficial movement is `1` and harmful
movement is `-1`. Missing metrics are omitted from the score and the active
weights are re-normalized.

| Metric | Direction | Weight |
|--------|-----------|--------|
| `latency_p95_ms` | lower is better | `0.20` |
| `latency_p99_ms` | lower is better | `0.15` |
| `error_rate` | lower is better | `0.20` |
| `throughput_rps` | higher is better | `0.15` |
| `availability` | higher is better | `0.15` |
| `restart_count` | lower is better | `0.10` |
| `cpu_utilization` | lower is better | `0.025` |
| `memory_utilization` | lower is better | `0.025` |

`hpa_current_replicas` and `hpa_desired_replicas` remain contextual evidence
and are not scored directly in v1.

## SLO Classification

The collector classifies current runtime evidence against
`slo-thresholds-v1.json` and records per-constraint results:

- `valid` when evidence exists and satisfies the constraint;
- `warning` when evidence exists and crosses a warning threshold;
- `invalid` when evidence exists and violates a hard constraint;
- `unknown` when required evidence is missing.

`runtimeFitness.eligibleForStableComparison` is `false` when any hard
constraint is `invalid` or `unknown`. The numeric runtime score may still be
emitted when comparable current and baseline metrics exist, but eligibility
keeps incomplete or unstable runs out of article-ready comparisons.

Readiness remains external evidence. It is classified as `unknown` unless a
future runtime summary contract adds a summarized readiness source.

## Local Example

```bash
cd /Users/oleksii_makieiev/Documents/startups/Lined/fitness-metrics-collector
npm run build
RUNTIME_ONLY=true \
RUNTIME_METRICS_JSON=/absolute/path/current/runtime-summary.json \
RUNTIME_BASELINE_METRICS_JSON=/absolute/path/baseline/runtime-summary.json \
METRICS_OUTPUT_JSON=/absolute/path/output/metrics-document.json \
npm run metrics
```

If `COSMOS_DB_CONNECTION_STRING` is absent, the collector writes the local
output document when `METRICS_OUTPUT_JSON` is set and skips database
persistence. Omit `RUNTIME_ONLY=true` when structural reports and `SONAR_TOKEN`
are available and the run should also compute the structural `fitnessScore`.
