# Runtime Scenario Summaries

This guide describes the scenario-runner seam for local runtime evidence in
the Lined backend experiment.

The runner accepts one deployment scenario, one k6 workload, and one output
root. It then coordinates the existing Kubernetes scenario manifests, k6
workload, Kubernetes state collection, and sanitized collector-ready runtime
summary output.

## Scope

This workflow provides:

- a local scenario runner under `load-tests/runtime-scenarios/`;
- a single command path for existing kind scenario overlays;
- sanitized `runtime-summary.json` files for the metrics collector;
- sanitized `runtime-summary-manifest.json` files for provenance.

This workflow does not add runtime-aware scoring, SLO classification, Cosmos
DB writes, cluster creation, image build/load steps, Secret management,
production monitoring, or backend product behavior changes.

## Prerequisites

Complete the kind baseline, telemetry, and workload setup first:

- deploy the local kind backend from `docs/kind-baseline.md`;
- keep the backend Service reachable from the host, usually with:

```bash
kubectl -n lined port-forward svc/lined-backend 8080:8080
```

- keep k6 installed locally, or pass a local k6 binary with `--k6-bin`;
- deploy Metrics Server only when CPU or memory utilization ratios are needed.

If Metrics Server is unavailable, the runner still writes a valid summary and
lists `cpu_utilization` and `memory_utilization` in `missing`.

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

Fixture profiles are versioned workload/context presets from
`load-tests/runtime-scenarios/fixture-profiles-v1.json`:

| Fixture profile | Workload | Purpose |
|-----------------|----------|---------|
| `local-smoke` | `smoke` | Minimal local command validation. |
| `comparison-baseline` | `baseline` | Stable default runtime comparison fixture. |
| `comparison-read-heavy` | `read-heavy` | Read-oriented comparison over bounded setup data. |
| `comparison-write-heavy` | `write-heavy` | Write-oriented comparison with per-iteration cleanup. |
| `comparison-mixed` | `mixed` | Mixed reads, updates, and bounded writes. |
| `comparison-stress` | `stress` | Ramping-VU local stress comparison. |

Profiles make the workload setup explicit by pinning allowed k6 inputs such as
`USER_COUNT`, `SEED_TASK_COUNT`, `SEED_EVENT_COUNT`, `VUS`, `DURATION`,
`STRESS_MAX_VUS`, `STRESS_STAGE_DURATION`, and `THINK_TIME_SECONDS`.
They do not change backend behavior or deployment manifests.

## Run One Scenario

Run the fixed-medium scenario with the smoke workload:

```bash
node load-tests/runtime-scenarios/scenario-runner-cli.mjs \
  --scenario fixed-medium \
  --workload smoke \
  --base-url http://localhost:8080
```

Run the same scenario with the stable baseline fixture:

```bash
node load-tests/runtime-scenarios/scenario-runner-cli.mjs \
  --scenario fixed-medium \
  --fixture-profile comparison-baseline \
  --base-url http://localhost:8080
```

The fixture profile supplies default workload and k6 environment inputs.
Explicit CLI options still win:

```bash
node load-tests/runtime-scenarios/scenario-runner-cli.mjs \
  --scenario fixed-medium \
  --fixture-profile comparison-baseline \
  --workload read-heavy \
  --k6-env VUS=2 \
  --base-url http://localhost:8080
```

Use overrides only when the run intentionally differs from the named fixture;
the manifest records both the selected profile and the effective workload
environment.

The runner applies the selected scenario, waits for the backend rollout, runs
k6 with summary export, collects summarized Kubernetes state, and writes:

```text
load-tests/runtime-scenarios/output/<scenario>-<workload>-<timestamp>/
  runtime-summary.json
  runtime-summary-manifest.json
```

If k6 exits non-zero because thresholds fail, the runner still writes
`runtime-summary-manifest.json` with the k6 exit code and summary-export
status, but it does not write collector-ready `runtime-summary.json`. This
keeps failed or resource-pressure runs inspectable without ingesting them as
clean runtime evidence.

Use `--skip-apply` only when the scenario is already applied and verified. A
stable manual pattern is:

1. Apply or verify the scenario.
2. Wait for rollout.
3. Start or verify the port-forward.
4. Run the scenario runner with `--skip-apply`.

This avoids losing the port-forward if `kubectl apply` replaces pods.

## HPA Cleanup Rule

Before running a fixed-replica scenario, the runner deletes
`hpa/lined-backend --ignore-not-found` unless `--skip-hpa-cleanup` is provided.
This prevents a previous HPA run from continuing to reconcile the backend
replica count during fixed-scenario measurements.

Use `--skip-hpa-cleanup` only when intentionally inspecting an existing HPA
side effect.

## Safety Rules

The runner keeps inputs narrow:

- scenario and workload names are hardcoded allowlists;
- fixture profile names and profile k6 environment keys are allowlisted;
- extra k6 environment variables are allowlisted;
- `BASE_URL` must point to `localhost`, `127.0.0.1`, or `[::1]` unless
  `--allow-remote-base-url` is provided;
- external commands are invoked with argument arrays, not shell strings.

Do not copy raw pod specs, raw Prometheus text, Secrets, environment
variables, or full k6 output into runtime artifacts.

## Metric Mapping

The collector-ready summary uses only aggregated fields:

| Summary field | Source |
|---------------|--------|
| `latency_p95_ms` | k6 `http_req_duration` `p(95)` from nested or flat summary export |
| `latency_p99_ms` | k6 `http_req_duration` `p(99)` from nested or flat summary export |
| `error_rate` | k6 `http_req_failed` `rate` or `value` |
| `throughput_rps` | k6 `http_reqs` `rate` |
| `restart_count` | measurement-window delta from pre-workload and post-workload backend restart counts |
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

`runtime-summary-manifest.json` is not collector score input. It remains a
sidecar provenance artifact with the existing manifest identity and status
fields:

- top-level `scenario`, `workload`, and `source`;
- `collector_summary_written`;
- `fixture_profile`;
- nested `git`, `workload_env`, and `kubernetes` sections.

The manifest now also carries additive provenance for audit and paper evidence,
including:

- deployed backend image under `kubernetes.image`;
- sanitized deployment configuration under `kubernetes.configuration`;
- a deterministic `provenance.configuration_hash` derived from stable
  deployment and workload-context inputs only;
- `provenance.telemetry_window`;
- `provenance.runtime_evidence_vector` when the collector-ready summary was
  actually built and written.

When k6 fails, omits summary export, or summary building/writing fails, the
manifest is still written but `collector_summary_written` stays `false` and the
runtime evidence vector is omitted instead of pretending that clean collector
input exists.

## Validate Locally

Run the unit tests:

```bash
node --test load-tests/runtime-scenarios/*.test.mjs
```

Render scenario overlays before collecting evidence:

```bash
kubectl kustomize k8s/kind/scenarios/fixed-small
kubectl kustomize k8s/kind/scenarios/fixed-medium
kubectl kustomize k8s/kind/scenarios/replicas-2
kubectl kustomize k8s/kind/scenarios/hpa-cpu
```

Validate collector parsing by building the collector and reading a generated
runtime summary:

```bash
cd /Users/oleksii_makieiev/Documents/startups/Lined/fitness-metrics-collector
npm run build
node -e "const { readRuntimeMetrics } = require('./dist/scripts/collectMetrics.js'); console.log(readRuntimeMetrics(process.argv[1]));" \
  /absolute/path/to/runtime-summary.json
```

Only persist a runtime summary when the run is intentional experiment evidence.
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
