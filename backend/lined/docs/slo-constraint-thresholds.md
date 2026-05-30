# SLO Constraint Thresholds

This guide defines the first version of local experiment SLO and constraint
thresholds for the Lined backend task `experiment/slo-constraint-thresholds`.

The thresholds classify summarized runtime evidence from local kind scenario
runs. They are experiment constraints, not production SLOs, not Prometheus
alerts, and not a runtime-aware fitness score. Later scoring tasks can consume
the classification output, but this task does not change the structural
`fitnessScore` or backend behavior.

## Scope

This task provides:

- initial validity thresholds for latency, error rate, availability, restarts,
  readiness, and resource pressure;
- missing-data rules for incomplete local summaries;
- source and rationale labels for each threshold;
- a versioned machine-readable threshold artifact at
  `load-tests/runtime-scenarios/slo-thresholds-v1.json`.

This task does not add adaptive scoring, Pareto optimization, CI gates,
Prometheus alerts, dashboards, production SLO commitments, or new backend
endpoints.

## Classification Model

Each runtime summary can be classified per constraint:

| Classification | Meaning |
|----------------|---------|
| `valid` | The metric exists and satisfies the constraint for the selected workload window. |
| `warning` | The metric exists and indicates pressure that should be reviewed, but does not invalidate the run by itself. |
| `invalid` | The metric exists and violates a hard validity constraint for a stable comparison run. |
| `unknown` | The metric is missing or the source was not collected; do not substitute zero. |

Overall scenario classification should be conservative:

- any `invalid` hard constraint makes the scenario invalid for stable
  comparison;
- one or more `warning` constraints keep the scenario usable, but the result
  must be reviewed with resource and throughput context;
- `unknown` constraints mean the scenario has incomplete evidence. Do not use
  it as article-ready proof until the missing source is collected or the gap is
  explicitly accepted.

## Measurement Window

Apply these thresholds to the selected workload measurement window, not to the
entire local setup session.

Before measuring, confirm:

```bash
kubectl -n lined rollout status deployment/lined-backend
curl http://localhost:8080/actuator/health/readiness
```

Exclude warm-up, image pull, rollout, and readiness transition time from the
latency and error-rate window. Record readiness failures during the workload
window separately because they indicate unstable scenario behavior.

The `negative-smoke` and `stress` k6 profiles are exploratory guardrails. Do
not apply the hard validity thresholds to them unless a later experiment task
defines profile-specific constraints.

## Thresholds v1

| Constraint | Metric/source | Rule | Severity | Missing data | Rationale |
|------------|---------------|------|----------|--------------|-----------|
| P95 latency | `latency_p95_ms` from k6 summary or Prometheus histogram | `<= 1000 ms` | invalid | unknown | Matches the existing local k6 reproducibility guardrail while keeping it separate from product SLOs. |
| P99 latency | `latency_p99_ms` from k6 summary or Prometheus histogram | `<= 2000 ms` | invalid | unknown | Catches tail latency regressions that p95 can hide in short local runs. |
| Error rate | `error_rate` from k6 `http_req_failed` or request status metrics | `<= 0.01` | invalid | unknown | Keeps stable scenario runs below the existing local failure guardrail. |
| Availability | `availability` from Prometheus `up`, health checks, or workload success window | `>= 0.99` | invalid | unknown | Separates service availability from request-level failures. |
| Restart delta | `restart_count` from Kubernetes pod status during the measurement window | `== 0` | invalid | unknown | A stable comparison run should not include backend container restarts during measurement. |
| Readiness | readiness probe or `/actuator/health/readiness` before and during workload | healthy | invalid | unknown | Ensures the workload measures a ready application rather than rollout transition behavior. |
| CPU pressure | `cpu_utilization` from Kubernetes metrics or Prometheus/process summary | `> 0.85` | warning | unknown | High CPU can explain latency or HPA behavior, but it is not independently bad without workload context. |
| Memory pressure | `memory_utilization` from Kubernetes metrics or JVM/process summary | `> 0.85` | warning | unknown | High memory can explain GC or stability symptoms, but should be interpreted with latency and restarts. |

HPA replica counts are context signals. `hpa_current_replicas` and
`hpa_desired_replicas` are not valid or invalid on their own. Use them to
explain autoscaling response, oscillation, or missing Metrics Server evidence.

Readiness is an external evidence source, not a `summary` metric in the
runtime-summary contract. A classifier should read it from recorded readiness
probe checks, Actuator health checks, or scenario notes.

For `restart_count`, record the measurement-window delta. If the source is a
cumulative Kubernetes pod restart count, capture the value before the workload
and subtract it from the value after the workload.

Throughput is also contextual for this first version. Do not invalidate a run
only because `throughput_rps` is lower than another scenario unless the same
workload, duration, request mix, and local capacity assumptions are held
constant.

## Source Labels

Every threshold entry must state one of these source labels:

| Source label | Meaning |
|--------------|---------|
| `local-experiment-assumption` | Initial threshold chosen for repeatable local comparison, not a product promise. |
| `existing-k6-guardrail` | Mirrors a current k6 pass/fail guardrail while keeping it outside product SLO semantics. |
| `telemetry-contract` | Comes from the runtime summary fields documented in `docs/runtime-fitness-extension.md`. |
| `future-calibration-needed` | Needs real experiment data before becoming a hard constraint. |

Use the source label in notes and result tables so future readers can separate
measured baselines from initial assumptions.

## Relationship To Existing Docs

- `docs/load-test-baseline.md` defines k6 pass/fail guardrails for workload
  reproducibility. This document defines experiment classification thresholds.
- `docs/runtime-metrics-baseline.md` and
  `docs/prometheus-telemetry-pipeline.md` define metric sources and PromQL
  query direction.
- `docs/hpa-resource-scenarios.md` defines scenario inputs whose resource
  pressure should be interpreted with workload and HPA context.
- `docs/runtime-fitness-extension.md` defines the runtime summary shape that
  later collector and scoring tasks can attach to metrics documents.

## Result Reporting

When recording a scenario result, include:

- scenario and workload names;
- threshold artifact version, currently `slo-thresholds-v1.json`;
- per-constraint classification;
- missing fields and source collection gaps;
- whether any hard invalid constraint failed;
- resource warnings and their relationship to throughput, latency, errors, or
  HPA state.

Do not claim an improved runtime-aware score from this classification alone.
Runtime-aware scoring belongs to `experiment/runtime-aware-scoring`.
