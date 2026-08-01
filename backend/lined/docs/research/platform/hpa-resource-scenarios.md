# HPA and Resource Scenarios

This guide describes the local Kubernetes deployment variants for the backend
experiment task `experiment/hpa-resource-scenarios`.

The scenarios preserve the Spring Boot backend business behavior and vary only
the backend Deployment resource envelope, replica count, or HPA policy. They
are intended for local kind experiments that compare deployment/runtime
trade-offs under the existing k6 workload.

## Scope

This task provides kustomize scenario manifests for:

- fixed backend resources under a smaller local envelope;
- fixed backend resources under a moderate local envelope;
- two fixed backend replicas;
- CPU-based HorizontalPodAutoscaler behavior.

This task does not add a Metrics Server manifest, Prometheus server,
OpenTelemetry Collector, production sizing recommendation, NodePort, Ingress,
or product behavior change.

## Prerequisites

- Deploy the kind baseline from `docs/research/platform/kind-baseline.md`.
- Build and load the local backend image into kind.
- Create the local-only `lined-postgres` Secret as described in the kind
  baseline guide.
- Keep the existing k6 workload from `docs/research/platform/load-test-baseline.md` available for
  smoke and baseline traffic.

For the HPA scenario only, install a Metrics Server configuration that works in
the local kind cluster. Verify that the resource metrics API is available before
expecting the HPA to calculate CPU utilization:

```bash
kubectl top pods -n lined
```

If `kubectl top` cannot read pod metrics, `kubectl describe hpa lined-backend`
will show missing or unknown metrics and the HPA will not make useful scaling
decisions.

## Scenario Matrix

| Scenario | Path | Backend replicas | CPU request | CPU limit | Memory request | Memory limit | HPA |
|----------|------|------------------|-------------|-----------|----------------|--------------|-----|
| Fixed small | `k8s/kind/scenarios/fixed-small` | 1 | `250m` | `500m` | `512Mi` | `768Mi` | none |
| Fixed medium | `k8s/kind/scenarios/fixed-medium` | 1 | `500m` | `1` | `768Mi` | `1Gi` | none |
| Replicas 2 | `k8s/kind/scenarios/replicas-2` | 2 | `500m` | `1` | `768Mi` | `1Gi` | none |
| HPA CPU | `k8s/kind/scenarios/hpa-cpu` | 1 to 3 | `500m` | `1` | `768Mi` | `1Gi` | CPU `70%` |

The values are local experiment inputs, not production recommendations. The
small scenario is intended to expose resource pressure. The medium scenario is
a stable fixed-resource comparison point. The two-replica scenario isolates
horizontal replication without autoscaling. The HPA scenario tests Kubernetes
autoscaling behavior when CPU utilization rises above the target. Local k6
traffic may be I/O-bound for some profiles, so treat HPA scale-out as evidence
only when Metrics Server reports backend CPU utilization near or above the
target.

Kubernetes calculates HPA resource utilization as a percentage of the
container's resource request, so the HPA scenario always sets a CPU request.

The scenario base mirrors the current `k8s/kind` baseline so each scenario can
render with the default `kubectl kustomize` load restrictions. When the
baseline manifests change, keep `k8s/kind/scenarios/base` in sync before
collecting scenario measurements.

## Render Scenarios

Render the baseline and each scenario before applying changes:

```bash
kubectl kustomize k8s/kind
kubectl kustomize k8s/kind/scenarios/fixed-small
kubectl kustomize k8s/kind/scenarios/fixed-medium
kubectl kustomize k8s/kind/scenarios/replicas-2
kubectl kustomize k8s/kind/scenarios/hpa-cpu
```

## Apply One Scenario

Use one scenario at a time for a measurement run:

```bash
kubectl apply -k k8s/kind/scenarios/fixed-small
kubectl -n lined rollout status deployment/lined-backend
```

Swap the path for another scenario when measuring a different variant:

```bash
kubectl apply -k k8s/kind/scenarios/fixed-medium
kubectl apply -k k8s/kind/scenarios/replicas-2
kubectl apply -k k8s/kind/scenarios/hpa-cpu
```

If the HPA scenario is active, delete the HPA before switching back to a fixed
scenario; otherwise it can keep reconciling the backend replica count.

For fixed scenarios, confirm the effective resource envelope:

```bash
kubectl -n lined get deployment lined-backend -o yaml
```

For the two-replica scenario, confirm that two backend pods are scheduled:

```bash
kubectl -n lined get pods -l app.kubernetes.io/name=lined-backend
```

For the HPA scenario, confirm HPA status after Metrics Server is available:

```bash
kubectl -n lined get hpa lined-backend
kubectl -n lined describe hpa lined-backend
```

## Run Workload Traffic

Forward the backend Service:

```bash
kubectl -n lined port-forward svc/lined-backend 8080:8080
```

Run a smoke workload before a longer scenario measurement:

```bash
k6 run \
  -e WORKLOAD=smoke \
  -e BASE_URL=http://localhost:8080 \
  load-tests/k6/load-test-baseline.js
```

Use the baseline, read-heavy, write-heavy, mixed, or stress profiles from
`docs/research/platform/load-test-baseline.md` for actual comparison runs.

## Runtime Signals To Capture

For each scenario, record:

- rendered scenario path and git commit;
- backend replica count before and after workload;
- CPU and memory requests/limits;
- HPA current and desired replicas when HPA is active;
- rollout stability and restart count;
- k6 checks, error rate, request duration, and throughput;
- Actuator Prometheus request and JVM metrics from
  `docs/research/platform/runtime-metrics-baseline.md`.

## Reset and Cleanup

Return to the baseline Deployment after a fixed scenario:

```bash
kubectl apply -k k8s/kind
kubectl -n lined rollout status deployment/lined-backend
```

Delete the HPA before returning to a fixed-replica scenario:

```bash
kubectl -n lined delete hpa lined-backend
kubectl apply -k k8s/kind
```

The HPA object changes `Deployment/lined-backend` replicas while it is active.
Remove it before measuring fixed replica scenarios so the autoscaler does not
continue reconciling the Deployment.
