# Runtime Fitness Extension

This guide describes the runtime-aware fitness extension for the Lined backend
experiment task `experiment/fitness-runtime-extension`.

The extension keeps the existing CI-only structural fitness score intact and
adds a separate contract for summarized runtime evidence. The goal is to make
fixed CI fitness comparable with runtime-aware adaptive fitness without
changing backend business behavior or breaking historical experiment data.

## Scope

This task provides:

- a runtime fitness metric contract for local kind experiments;
- a backward-compatible collector input shape for summarized runtime metrics;
- normalization direction and missing-data rules for later scoring;
- a Cosmos DB document extension that preserves the existing `fitnessScore`.

This task does not add a Prometheus server, OpenTelemetry Collector, live
GitHub Actions deployment, adaptive weighting implementation, Pareto optimizer,
dashboard, or product endpoint.

## Score Separation

The current top-level `fitnessScore` remains the structural CI score computed
from Checkstyle, SpotBugs, JaCoCo, and SonarCloud metrics. Do not reinterpret
or reweight that field with runtime data because the analyzer and historical
Cosmos DB documents already use it as the CI baseline.

Runtime-aware evaluation must use separate fields:

```json
{
  "fitnessScore": 0.1234,
  "metrics": {
    "checkstyle_violations": 0,
    "spotbugs_total": 0,
    "runtime_metrics": {
      "schema_version": 1,
      "scenario": "fixed-medium",
      "workload": "baseline",
      "source": "local-kind",
      "summary": {
        "latency_p95_ms": 250.5,
        "latency_p99_ms": 550.25,
        "error_rate": 0.002,
        "throughput_rps": 42.1,
        "availability": 1,
        "restart_count": 0,
        "cpu_utilization": 0.62,
        "memory_utilization": 0.71,
        "hpa_desired_replicas": 2,
        "hpa_current_replicas": 2
      }
    }
  }
}
```

A later scoring task can add top-level fields such as `runtimeFitnessScore` or
`fitnessScores.runtime`. It must not replace the meaning of `fitnessScore`.

## Runtime Metric Sources

Runtime metrics come from explicit experiment artifacts, not from live scraping
inside the existing CI collector.

| Source | Input artifact | Runtime evidence |
|--------|----------------|------------------|
| k6 workload | End-of-test summary JSON from `handleSummary()` or summary export | latency percentiles, request failure rate, request count, throughput, checks |
| Actuator Prometheus | Summarized scrape or query output from `/actuator/prometheus` | request histograms, JVM memory, process CPU, HikariCP pressure |
| Kubernetes state | Summarized `kubectl` output for Deployment, pods, and HPA | replicas, restarts, resource requests/limits, HPA current/desired replicas |

Store summarized values only. Do not store raw Prometheus exposition text,
full pod YAML, secrets, environment variables, or generated load-test output in
Cosmos DB.

## Metric Contract

| Field | Unit/range | Better direction | Source |
|-------|------------|------------------|--------|
| `latency_p95_ms` | milliseconds, `>= 0` | lower | k6 summary or Prometheus histogram |
| `latency_p99_ms` | milliseconds, `>= 0` | lower | k6 summary or Prometheus histogram |
| `error_rate` | ratio, `0..1` | lower | k6 `http_req_failed` or request status metrics |
| `throughput_rps` | requests per second, `>= 0` | higher | k6 `http_reqs.rate` or Prometheus request rate |
| `availability` | ratio, `0..1` | higher | scrape `up`, health checks, or successful workload window |
| `restart_count` | measurement-window restart delta, `>= 0` | lower | Kubernetes pod status before and after workload |
| `cpu_utilization` | ratio of request or local capacity, `0..1+` | lower within stable throughput | Kubernetes metrics or summarized Prometheus/process CPU |
| `memory_utilization` | ratio of limit/request, `0..1+` | lower within stable throughput | Kubernetes metrics or JVM/process summary |
| `hpa_current_replicas` | count, `>= 0` | contextual | Kubernetes HPA |
| `hpa_desired_replicas` | count, `>= 0` | contextual | Kubernetes HPA |

For HPA scenarios, replica counts are not inherently good or bad. They are
context for detecting autoscaling response, oscillation, and resource pressure.
Score formulas should combine them with latency, error rate, and utilization.

## Normalization Rules

Use the current stable scenario as the runtime baseline for local experiments.
When comparing a scenario to baseline:

- lower-is-better metrics normalize as `(baseline - current) / baseline`;
- higher-is-better metrics normalize as `(current - baseline) / baseline`;
- clamp normalized values to `[-1, 1]` before weighting;
- if baseline and current are both zero, treat the normalized delta as `0`;
- if baseline is zero and current is non-zero, return `1` for beneficial
  movement and `-1` for harmful movement;
- if a metric is missing, omit it from runtime scoring and record the missing
  field instead of assuming zero.

Runtime score formulas must publish their active metric set and weights in the
stored document or in a versioned scoring document. That keeps article analysis
reproducible when the metric set changes.

Before a runtime summary is used for scoring, classify it against the initial
constraint set in `docs/slo-constraint-thresholds.md` and the versioned
threshold artifact at `load-tests/runtime-scenarios/slo-thresholds-v1.json`.
Those constraints identify invalid, warning, and unknown evidence without
changing the top-level structural `fitnessScore`.

## Optional Collector Input

The metrics collector can attach summarized runtime evidence when an explicit
runtime JSON file is provided. Normal CI runs without this file must continue
to behave exactly as before.

Recommended environment variable:

```text
RUNTIME_METRICS_JSON=/path/to/runtime-summary.json
```

Recommended file shape:

```json
{
  "schema_version": 1,
  "scenario": "fixed-medium",
  "workload": "baseline",
  "source": "local-kind",
  "summary": {
    "latency_p95_ms": 250.5,
    "latency_p99_ms": 550.25,
    "error_rate": 0.002,
    "throughput_rps": 42.1,
    "availability": 1,
    "restart_count": 0,
    "cpu_utilization": 0.62,
    "memory_utilization": 0.71
  },
  "missing": []
}
```

The collector should validate only the summarized shape. It should not run k6,
deploy kind, call Kubernetes, or scrape Actuator endpoints by itself.

## Compatibility Rules

- Existing Cosmos DB documents remain valid when `metrics.runtime_metrics` is
  absent.
- The Python analyzer keeps using top-level `fitnessScore` for structural
  fitness charts unless a later task explicitly adds runtime charts.
- Runtime-aware scoring must be additive and versioned.
- Backend API behavior, Actuator exposure, and Kubernetes manifests stay
  unchanged in this task.

## Verification

Before using a runtime summary in an experiment:

1. Run a k6 smoke workload from `docs/load-test-baseline.md`.
2. Verify Actuator metrics from `docs/runtime-metrics-baseline.md`.
3. Record the active deployment scenario from `docs/hpa-resource-scenarios.md`.
4. Produce a summarized runtime JSON file.
5. Run the collector with `RUNTIME_METRICS_JSON` set.
6. Confirm the stored document preserves `fitnessScore` and adds
   `metrics.runtime_metrics` separately.
