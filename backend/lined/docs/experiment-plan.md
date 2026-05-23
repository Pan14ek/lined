# Scientific Experiment Plan

## Research Context

Lined will be used as the empirical case-study backend for evaluating adaptive
multi-objective fitness functions for cloud-native evolutionary architecture.

The experiment should preserve the current Spring Boot backend as the stable
application under test and add experiment infrastructure around it.

Core research direction:

```text
fixed CI structural fitness -> runtime-aware adaptive fitness -> Pareto-based optimization
```

## Current Baseline

The repository already supports a fixed-weight CI fitness baseline through:

- Checkstyle
- SpotBugs
- JaCoCo line coverage
- SonarCloud metrics
- GitHub Actions
- Cosmos DB storage for pipeline-run metrics
- Python analysis scripts for charts and statistics

This baseline should remain available for comparison against runtime-aware and
multi-objective variants.

## Experiment Platform

Use local Kubernetes with kind for the first experiment phase. Lens can be used
for cluster inspection and debugging.

Initial platform target:

| Layer      | Target                                                                 |
|------------|------------------------------------------------------------------------|
| Kubernetes | kind local cluster                                                     |
| Database   | PostgreSQL inside Kubernetes                                           |
| Backend    | Spring Boot container deployed to Kubernetes                           |
| Health     | Spring Boot Actuator health endpoints                                  |
| Metrics    | Actuator Prometheus endpoint, later Prometheus/OpenTelemetry Collector |
| Workload   | k6 or JMeter load-test scenarios                                       |

Managed cloud is not required for the first evaluation. It can be discussed as
future validation if the local experiment produces a useful baseline.

## Fitness Dimensions

The experiment should extend the current structural fitness baseline with
runtime and deployment signals.

| Dimension                | Example signals                                                             |
|--------------------------|-----------------------------------------------------------------------------|
| Structural quality       | Checkstyle violations, SpotBugs issues, JaCoCo coverage, SonarCloud issues. |
| Runtime performance      | p95/p99 latency, throughput, request duration histograms.                   |
| Reliability              | error rate, failed requests, availability, health transitions.              |
| Deployment configuration | replicas, CPU/memory requests and limits, HPA settings, probe settings.     |
| Operational stability    | restart count, rollout stability, autoscaling oscillation.                  |
| Economic efficiency      | CPU/memory utilization, overprovisioning proxy, cost proxy.                 |

## Baseline Comparison

Compare at least these approaches:

| Approach                      | Purpose                                                                |
|-------------------------------|------------------------------------------------------------------------|
| Binary quality gate           | Shows pass/fail CI control behavior.                                   |
| Existing fixed-weight fitness | Existing scalar baseline from CI metrics.                              |
| Adaptive weighted fitness     | Tests context-sensitive weights under load, SLO, or resource pressure. |
| Pareto-based GA               | Preserves trade-offs between conflicting objectives.                   |

## First Experiment Flow

1. Containerize the backend without changing application behavior.
2. Deploy PostgreSQL and backend to kind.
3. Verify health and metrics endpoints.
4. Add a repeatable load-test baseline.
5. Collect runtime metrics for one stable deployment.
6. Add deployment variants: replicas, resource settings, probe settings, HPA.
7. Compare variants with scalar and multi-objective fitness models.
8. Document limitations and metric bias.

## Constraints

- Do not rewrite Lined into microservices in the first phase.
- Do not add AI product features as part of the experiment foundation.
- Do not change business behavior unless the task explicitly calls for a
  controlled architecture alternative.
- Keep every experiment implementation in a separate PR.
- Use `experiment/` branch names from `experiment-tasks.md`.

## Expected Evidence

The experiment should produce:

- deployment manifests or scripts for reproducible local runs
- workload scripts
- runtime metrics snapshots
- CI structural metric snapshots
- comparison tables for deployment alternatives
- charts or data suitable for the article
- documented limitations and threats to validity
