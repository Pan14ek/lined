# Prometheus Telemetry Pipeline

This guide describes the local Prometheus collection path for the Lined backend
experiment task `experiment/prometheus-telemetry-pipeline`.

The pipeline keeps backend behavior unchanged. It deploys a plain Prometheus
server into the local kind cluster and scrapes the existing Spring Boot
Actuator endpoint at `/actuator/prometheus` through Kubernetes pod
annotations.

## Scope

This task provides:

- a local Prometheus Deployment, Service, ConfigMap, and pod-discovery RBAC;
- annotation-based scraping for backend pods in the `lined` namespace;
- short-lived local metric retention for scenario comparison;
- PromQL examples for latency, throughput, reliability, JVM, CPU, and
  availability checks.

This task does not add Grafana, Alertmanager, Prometheus Operator,
ServiceMonitor resources, remote storage, OpenTelemetry traces, production
security hardening, or runtime-aware scoring.

## Prerequisites

Complete the kind baseline from `docs/kind-baseline.md` first:

```bash
docker build -t lined-backend:local .
kind load docker-image lined-backend:local --name lined
kubectl apply -f k8s/kind/namespace.yaml
kubectl -n lined create secret generic lined-postgres \
  --from-literal=username=postgres \
  --from-literal=password=postgres \
  --from-literal=database=lineddb \
  --dry-run=client \
  -o yaml | kubectl apply -f -
kubectl apply -k k8s/kind
kubectl -n lined rollout status deployment/lined-postgres
kubectl -n lined rollout status deployment/lined-backend
```

Confirm that the backend metrics endpoint works before deploying Prometheus:

```bash
kubectl -n lined port-forward svc/lined-backend 8080:8080
curl http://localhost:8080/actuator/prometheus
```

## Deploy Prometheus

Apply the Prometheus kustomize slice:

```bash
kubectl apply -k k8s/kind/telemetry/prometheus
kubectl -n lined rollout status deployment/lined-prometheus
```

Open the local Prometheus UI:

```bash
kubectl -n lined port-forward svc/lined-prometheus 9090:9090
```

Then visit `http://localhost:9090`.

## Scrape Configuration

Prometheus uses Kubernetes pod service discovery in the `lined` namespace and
keeps only pods with the existing backend scrape annotation:

```yaml
prometheus.io/scrape: "true"
prometheus.io/path: /actuator/prometheus
prometheus.io/port: "8080"
```

The scrape job reads the path and port from annotations, then preserves useful
Kubernetes labels such as `app.kubernetes.io/name` and
`app.kubernetes.io/part-of` for scenario comparison queries.

The local Prometheus server stores samples in an `emptyDir` volume with
six-hour retention. This is intentionally short-lived and only meant for a
single local experiment session.

## Verify Collection

In Prometheus, run these queries:

```promql
up{job="kubernetes-pods"}
up{job="kubernetes-pods", app_kubernetes_io_name="lined-backend"}
http_server_requests_seconds_count{application="lined-backend"}
jvm_memory_used_bytes{application="lined-backend"}
process_cpu_usage{application="lined-backend"}
```

Expected result:

- `up` is `1` for the running backend pod;
- `http_server_requests_seconds_count` appears after at least one backend HTTP
  request;
- JVM and process metrics are available from the Actuator Prometheus endpoint.

If request metrics are missing, send traffic to the backend and query again:

```bash
curl http://localhost:8080/actuator/health
curl http://localhost:8080/actuator/metrics/http.server.requests
```

## Scenario Queries

Use these queries after running a smoke or baseline workload from
`docs/load-test-baseline.md`.

P95 latency by URI and method:

```promql
histogram_quantile(
  0.95,
  sum(rate(http_server_requests_seconds_bucket{application="lined-backend"}[5m]))
    by (le, uri, method)
)
```

Throughput:

```promql
sum(rate(http_server_requests_seconds_count{application="lined-backend"}[5m]))
```

Error rate by status outcome:

```promql
sum(rate(http_server_requests_seconds_count{
  application="lined-backend",
  outcome!="SUCCESS"
}[5m]))
/
sum(rate(http_server_requests_seconds_count{application="lined-backend"}[5m]))
```

JVM heap usage:

```promql
sum(jvm_memory_used_bytes{application="lined-backend", area="heap"})
```

Process CPU usage:

```promql
process_cpu_usage{application="lined-backend"}
```

Scrape availability:

```promql
avg_over_time(up{job="kubernetes-pods", app_kubernetes_io_name="lined-backend"}[5m])
```

## Run With Workload Traffic

Forward the backend Service in one terminal:

```bash
kubectl -n lined port-forward svc/lined-backend 8080:8080
```

Run a smoke workload before querying Prometheus:

```bash
k6 run \
  -e WORKLOAD=smoke \
  -e BASE_URL=http://localhost:8080 \
  load-tests/k6/load-test-baseline.js
```

For scenario comparison, apply one scenario from
`docs/hpa-resource-scenarios.md`, run the selected workload profile, then query
Prometheus while the local retention window still contains the run.

## Cleanup

Remove only the Prometheus telemetry resources:

```bash
kubectl delete -k k8s/kind/telemetry/prometheus
```

This leaves the backend, PostgreSQL, and local Secret in place. Use
`docs/kind-baseline.md` for full baseline cleanup.

## Limitations

- This pipeline is local experiment infrastructure, not a production monitoring
  stack.
- Metrics are stored in ephemeral `emptyDir` storage and disappear when the
  Prometheus pod or kind cluster is deleted.
- No alerts, dashboards, long-term storage, or remote write integration are
  configured.
- Actuator endpoints remain exposed for local research convenience; this is
  not a production security model.
- OpenTelemetry remains disabled in the backend Deployment. This task collects
  Prometheus metrics only, not traces or spans.
