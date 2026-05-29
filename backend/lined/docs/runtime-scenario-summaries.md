# Runtime Scenario Summaries

This guide describes the repeatable local workflow for the Lined backend
experiment task `experiment/runtime-scenario-summaries`.

The workflow runs one kind deployment scenario under one selected k6 workload
and writes a sanitized `runtime-summary.json` artifact that matches the
collector contract from `runtime-fitness-extension.md`. It preserves backend
business behavior and keeps runtime evidence separate from the existing
structural `fitnessScore`.

## Scope

This task provides:

- a local runtime summary CLI under `load-tests/runtime-scenarios/`;
- a repeatable command path for existing kind scenarios;
- sanitized collector-ready `runtime-summary.json` artifacts;
- a separate sanitized manifest for run provenance.

This task does not add runtime-aware scoring, change the collector's structural
fitness score, add production monitoring, change Kubernetes scenario resources,
or store raw Kubernetes, Prometheus, or k6 output in Cosmos DB.

## Prerequisites

Complete the kind baseline, telemetry, and workload setup first:

- deploy the local kind backend from `docs/kind-baseline.md`;
- keep the backend Service reachable from the host, usually with:

```bash
kubectl -n lined port-forward svc/lined-backend 8080:8080
```

- keep k6 installed locally, or use an equivalent local k6 binary on `PATH`;
- deploy Metrics Server only when CPU or memory utilization ratios are needed.

If Metrics Server is unavailable, the CLI still writes a valid summary and
adds `cpu_utilization` and `memory_utilization` to `missing`.

## Supported Inputs

Scenarios are the existing local kind variants from
`docs/hpa-resource-scenarios.md`:

| Scenario | Kustomize path |
|----------|----------------|
| `fixed-small` | `k8s/kind/scenarios/fixed-small` |
| `fixed-medium` | `k8s/kind/scenarios/fixed-medium` |
| `replicas-2` | `k8s/kind/scenarios/replicas-2` |
| `hpa-cpu` | `k8s/kind/scenarios/hpa-cpu` |

Workloads are the existing k6 profiles from `docs/load-test-baseline.md`:

```text
smoke, baseline, read-heavy, write-heavy, mixed, stress, negative-smoke
```

Use `smoke` for command validation and one of the longer non-negative profiles
for scenario comparison.

## Run One Scenario

Run the fixed-medium scenario with the smoke workload:

```bash
node load-tests/runtime-scenarios/runtime-summary-cli.mjs \
  --scenario fixed-medium \
  --workload smoke \
  --base-url http://localhost:8080
```

Run the same scenario with the default baseline workload:

```bash
node load-tests/runtime-scenarios/runtime-summary-cli.mjs \
  --scenario fixed-medium \
  --workload baseline \
  --base-url http://localhost:8080
```

The CLI applies the selected scenario, waits for the backend rollout, runs k6
with `--summary-export`, collects summarized Kubernetes state, and writes:

```text
load-tests/runtime-scenarios/output/<scenario>-<workload>-<timestamp>/
  runtime-summary.json
  runtime-summary-manifest.json
```

If k6 exits non-zero because thresholds fail, the CLI still writes
`runtime-summary-manifest.json` with the k6 exit code and summary-export status,
but it does not write collector-ready `runtime-summary.json`. This keeps failed
or resource-pressure runs inspectable without accidentally ingesting them as
clean runtime evidence.

Use `--skip-apply` only when the scenario is already applied and verified.

## HPA Cleanup Rule

Before running a fixed-replica scenario, the CLI deletes
`hpa/lined-backend --ignore-not-found` unless `--skip-hpa-cleanup` is provided.
This prevents a previous HPA run from continuing to reconcile the backend
replica count during fixed-scenario measurements.

Use `--skip-hpa-cleanup` only when intentionally inspecting an existing HPA
side effect.

## Metric Mapping

The collector-ready summary uses only aggregated fields:

| Summary field | Source |
|---------------|--------|
| `latency_p95_ms` | k6 `http_req_duration.values["p(95)"]` |
| `latency_p99_ms` | k6 `http_req_duration.values["p(99)"]` |
| `error_rate` | k6 `http_req_failed.values.rate` |
| `throughput_rps` | k6 `http_reqs.values.rate` |
| `restart_count` | summed backend container restart counts |
| `cpu_utilization` | summed backend CPU usage divided by summed CPU requests |
| `memory_utilization` | summed backend memory usage divided by summed memory limits |
| `hpa_current_replicas` | HPA `status.currentReplicas` when present |
| `hpa_desired_replicas` | HPA `status.desiredReplicas` when present |

`availability` is omitted until the workflow has a real readiness or scrape
availability window. The field is listed in `missing` instead of being inferred
from `error_rate`.

CPU and memory utilization require both usage data from `kubectl top pods` and
resource denominators from the backend Deployment. If either side is missing,
the metric is omitted and listed in `missing`.

## Artifact Contract

`runtime-summary.json` is the only file intended for
`RUNTIME_METRICS_JSON` collector ingestion:

```json
{
  "schema_version": 1,
  "scenario": "fixed-medium",
  "workload": "smoke",
  "source": "local-kind",
  "summary": {
    "latency_p95_ms": 250.5,
    "latency_p99_ms": 550.25,
    "error_rate": 0,
    "throughput_rps": 42.1,
    "restart_count": 0
  },
  "missing": [
    "availability",
    "cpu_utilization",
    "memory_utilization"
  ]
}
```

`runtime-summary-manifest.json` is not collector input. It records sanitized
provenance such as scenario path, workload variables, git commit, CLI version,
start/end timestamps, and k6 exit code. Do not copy raw pod specs, raw
Prometheus text, secrets, or full k6 output into either artifact.

## Validate Collector Ingestion

For local parser validation, build the collector and call its runtime parser
without setting `COSMOS_DB_CONNECTION_STRING`:

```bash
cd /Users/oleksii_makieiev/Documents/startups/Lined/fitness-metrics-collector
npm run build
node -e "const { readRuntimeMetrics } = require('./dist/scripts/collectMetrics.js'); console.log(readRuntimeMetrics(process.argv[1]));" \
  /absolute/path/to/runtime-summary.json
```

Only persist a runtime summary when the run is intentional experiment evidence.
In that case, point the collector at it explicitly:

```bash
cd /Users/oleksii_makieiev/Documents/startups/Lined/fitness-metrics-collector
RUNTIME_METRICS_JSON=/absolute/path/to/runtime-summary.json npm run metrics
```

Normal CI runs without `RUNTIME_METRICS_JSON` continue to use the structural
fitness score only.

## Cleanup

Generated runtime summaries are local experiment artifacts and are ignored by
git under `load-tests/runtime-scenarios/output/`.

Return to the baseline deployment after scenario collection:

```bash
kubectl -n lined delete hpa lined-backend --ignore-not-found
kubectl apply -k k8s/kind
kubectl -n lined rollout status deployment/lined-backend
```

Reset the local database when retained synthetic `k6_` users are no longer
useful for repeated experiments.
