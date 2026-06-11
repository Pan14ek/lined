# Runtime Quality Scenario Catalog

This catalog defines the runtime quality scenarios for
`experiment/runtime-quality-scenario-catalog`.

The scenarios translate existing Lined experiment inputs into
architecture-driver scenarios. They connect local kind deployment variants,
k6 workload profiles, runtime-summary fields, and SLO classifications to
explicit quality attributes and response measures.

## Scope

This task provides:

- a v1 catalog of Lined runtime quality scenarios;
- architecture-driver fields for each scenario;
- a machine-readable companion artifact at
  `load-tests/runtime-scenarios/runtime-quality-scenarios-v1.json`;
- an evidence-kind taxonomy that separates live telemetry from provenance and
  future surrogate or simulated evidence.

This task does not change backend API behavior, Kubernetes manifests, k6
workload logic, runtime-summary schema, collector scoring semantics, adaptive
weighting, Pareto ranking, or production SLO commitments.

## Evidence Kinds

| Evidence kind | Meaning | Collector input |
|---------------|---------|-----------------|
| `live-telemetry` | Aggregated evidence collected from a local kind run, k6 summary output, Kubernetes state, Actuator health, or Prometheus-derived summaries. | May be collector input when it is represented as `runtime-summary.json`. |
| `manifest-provenance` | Sanitized metadata about how evidence was produced, such as scenario path, workload, commit, timestamps, and command outcome. | Not collector input. Use it for audit and exclusion reasoning. |
| `surrogate-or-simulated` | Future non-live evidence produced by a model, simulator, digital twin, approximation, or manually constructed surrogate. | Not interchangeable with live telemetry. Must carry model version, assumptions, uncertainty notes, and source provenance before use. |

Use `live-telemetry` for the current local kind experiment evidence. Use
`manifest-provenance` only to explain how a run was produced or why it was
excluded. Reserve `surrogate-or-simulated` for future work; do not mix it with
live telemetry in runtime scoring or article evidence without an explicit
label.

## Architecture-Driver Fields

Every scenario in the JSON catalog uses these fields:

| Field | Meaning |
|-------|---------|
| `id` | Stable scenario identifier for docs, result tables, and tooling. |
| `environment` | Execution environment where the stimulus is applied. |
| `stimulus` | Runtime condition or workload pressure under evaluation. |
| `stimulus_source` | Actor, script, or platform mechanism that creates the stimulus. |
| `affected_artifact` | Backend, deployment, workflow, or runtime component under observation. |
| `expected_response` | Expected observable behavior during the measurement window. |
| `response_measure` | Metric or evidence used to judge the expected response. |
| `iso_25010_attribute` | Primary ISO/IEC 25010 quality attribute represented by the scenario. |
| `kpi` | Concrete KPI or SLI name used in experiment reporting. |
| `slo_or_constraint_role` | Whether the signal is a hard constraint, warning, objective, context signal, or validation evidence. |
| `evidence_source` | Artifact or telemetry source used to support the scenario. |
| `evidence_kind` | Evidence taxonomy value from this document. |
| `supported_runtime_summary_fields` | Runtime-summary fields that can represent the evidence. |
| `related_workload_profiles` | k6 workload profiles that can exercise the scenario. |
| `related_deployment_scenarios` | Local kind scenario overlays relevant to the scenario. |

## Scenario Catalog v1

| ID | Quality attribute | Driver | KPI / response measure | Role | Evidence |
|----|-------------------|--------|------------------------|------|----------|
| `stable-baseline-latency` | Performance efficiency | Baseline traffic against `fixed-medium`. | p95/p99 latency, error rate, throughput. | Hard latency/error constraints plus throughput objective/context. | k6 summary and runtime summary. |
| `small-resource-pressure` | Resource utilization / performance efficiency | Baseline or mixed workload against `fixed-small`. | CPU utilization, memory utilization, latency, error rate, restart delta. | Resource warning signals with hard latency/error/restart constraints. | Kubernetes state, k6 summary, runtime summary. |
| `replica-horizontal-capacity` | Scalability | Baseline, read-heavy, or mixed workload against `replicas-2`. | Throughput, latency, error rate, restart delta. | Optimization objective with hard validity constraints. | k6 summary, Kubernetes state, runtime summary. |
| `hpa-cpu-scaling-response` | Scalability / reliability | CPU-sensitive workload against `hpa-cpu`. | HPA desired/current replicas, CPU utilization, latency, error rate. | Context signal and warning evidence; hard validity still comes from latency, error, readiness, and restarts. | HPA state, Kubernetes metrics, k6 summary, runtime summary. |
| `read-heavy-query-responsiveness` | Performance efficiency | Read-heavy bounded workload over users, lobby, tasks, and events. | p95/p99 latency, throughput, error rate. | Runtime objective under hard validity constraints. | k6 summary and runtime summary. |
| `write-heavy-stability` | Reliability / performance efficiency | Write-heavy bounded workload with per-iteration cleanup. | error rate, restart delta, p95/p99 latency, throughput. | Hard reliability constraints plus contextual throughput. | k6 summary, Kubernetes state, runtime summary. |
| `mixed-workflow-balance` | Performance efficiency / reliability | Mixed reads, updates, and bounded writes. | latency, error rate, throughput, restart delta. | Balanced comparison objective under hard validity constraints. | k6 summary, Kubernetes state, runtime summary. |
| `local-stress-exploration` | Reliability / capacity behavior | Local stress fixture with ramping virtual users. | latency, error rate, throughput, CPU/memory pressure, HPA state when applicable. | Exploratory evidence only; v1 hard stable-comparison thresholds do not apply. | k6 summary, Kubernetes state, runtime summary manifest, optional runtime summary when the run is intentionally accepted. |

## Relationship To Existing Artifacts

- `docs/runtime-scenario-summaries.md` defines how local scenario runs produce
  `runtime-summary.json` and `runtime-summary-manifest.json`.
- `docs/hpa-resource-scenarios.md` defines the local kind deployment variants:
  `fixed-small`, `fixed-medium`, `replicas-2`, and `hpa-cpu`.
- `docs/slo-constraint-thresholds.md` and
  `load-tests/runtime-scenarios/slo-thresholds-v1.json` define v1 validity and
  warning classifications.
- `docs/runtime-fitness-extension.md` defines runtime-summary fields and
  preserves the existing structural `fitnessScore` semantics.
- `load-tests/runtime-scenarios/fixture-profiles-v1.json` defines workload
  fixture profiles used by scenario runs.

## Interpretation Rules

- Treat this catalog as scenario metadata and traceability, not as a scoring
  formula.
- Do not infer missing runtime-summary fields as zero.
- Do not treat stress or negative smoke runs as stable comparison evidence
  unless a later task defines profile-specific constraints.
- Do not treat HPA replica counts as inherently good or bad; interpret them
  with workload, latency, error, CPU, and missing Metrics Server evidence.
- Keep objectives, hard constraints, context signals, and validation evidence
  separate when reporting results.
- Keep live telemetry, provenance metadata, and future surrogate or simulated
  evidence visibly separate in article tables and collector inputs.
