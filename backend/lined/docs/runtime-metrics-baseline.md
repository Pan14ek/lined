# Runtime Metrics Baseline

This guide describes the runtime metrics baseline for the Lined backend
experiment task `experiment/runtime-metrics-baseline`.

The baseline keeps the Spring Boot application behavior unchanged and exposes
Micrometer metrics through Spring Boot Actuator in Prometheus text format.
These signals are the first runtime evidence source for later load-test,
resource, HPA, and runtime-aware fitness-function tasks.

## Scope

This task provides:

- Prometheus-compatible backend metrics at `/actuator/prometheus`.
- Kubernetes scrape metadata for the local kind backend Service and pod.
- A documented set of runtime signals for latency, error, JVM, process,
  system, and database analysis.

This task does not add a Prometheus server, OpenTelemetry Collector, load-test
scenario, HPA policy, or fitness-model calculation. Those remain separate
experiment tasks.

## Backend Metrics Configuration

The backend uses Spring Boot Actuator and the Micrometer Prometheus registry.
The runtime configuration exposes these Actuator endpoints:

```properties
management.endpoints.web.exposure.include=health,info,metrics,prometheus,threaddump,loggers
management.metrics.tags.application=lined-backend
management.metrics.distribution.percentiles-histogram.http.server.requests=true
management.metrics.distribution.percentiles.http.server.requests=0.5,0.9,0.95,0.99
management.metrics.distribution.sla.http.server.requests=100ms,200ms,500ms,1s,2s,5s
```

The `application=lined-backend` tag gives every exported metric a stable
application label for experiment queries. HTTP server request histograms and
percentiles make latency analysis possible from the Prometheus scrape.

## Verify Locally

Start the backend with its normal PostgreSQL configuration, then query:

```bash
curl http://localhost:8080/actuator/prometheus
curl http://localhost:8080/actuator/metrics
curl http://localhost:8080/actuator/metrics/http.server.requests
```

Expected result:

- `/actuator/prometheus` returns `text/plain` Prometheus exposition data.
- `/actuator/metrics` includes names such as `http.server.requests`,
  `jvm.memory.used`, `process.cpu.usage`, and `system.cpu.usage`.
- `/actuator/metrics/http.server.requests` returns request timers grouped by
  tags such as method, status, outcome, exception, and URI.

If `http.server.requests` is missing, send at least one HTTP request to the
backend and query the endpoint again.

## Verify in kind

Deploy the kind baseline from `docs/kind-baseline.md`, then forward the backend
Service:

```bash
kubectl -n lined port-forward svc/lined-backend 8080:8080
```

In another terminal, query:

```bash
curl http://localhost:8080/actuator/prometheus
curl http://localhost:8080/actuator/metrics/http.server.requests
```

The local kind Service and backend pod include these scrape annotations:

```yaml
prometheus.io/scrape: "true"
prometheus.io/path: /actuator/prometheus
prometheus.io/port: "8080"
```

These annotations support simple annotation-based Prometheus discovery. A later
task can add a dedicated Prometheus deployment, ServiceMonitor, or
OpenTelemetry Collector without changing the backend application endpoint.
The local Prometheus deployment and query workflow are documented in
`docs/prometheus-telemetry-pipeline.md`.

## Runtime Signals

| Signal group | Prometheus metric examples | Use in experiment analysis |
|--------------|----------------------------|----------------------------|
| Request latency | `http_server_requests_seconds_bucket`, `http_server_requests_seconds_count`, `http_server_requests_seconds_sum`, `http_server_requests_seconds_max` | Estimate p50, p90, p95, and p99 latency under baseline and later load profiles. |
| Request reliability | `http_server_requests_seconds_count` with `status`, `outcome`, `exception`, and `uri` labels | Compute error rate and failed-request share by endpoint and scenario. |
| Throughput | `http_server_requests_seconds_count` rate over time | Compare served request volume across deployment variants. |
| JVM memory | `jvm_memory_used_bytes`, `jvm_memory_committed_bytes`, `jvm_gc_pause_seconds_count`, `jvm_gc_pause_seconds_sum` | Detect memory pressure, GC overhead, and workload sensitivity. |
| Process CPU | `process_cpu_usage`, `process_cpu_time_ns` | Compare backend CPU pressure across load and resource settings. |
| System CPU | `system_cpu_usage`, `system_cpu_count` | Keep local cluster host pressure visible during runs. |
| Threads | `jvm_threads_live_threads`, `jvm_threads_daemon_threads`, `jvm_threads_peak_threads` | Detect thread growth or saturation symptoms. |
| Database pool | `hikaricp_connections_active`, `hikaricp_connections_idle`, `hikaricp_connections_pending`, `hikaricp_connections_timeout_total` | Track PostgreSQL connection pressure during workflow tests. |
| Availability | `up` from Prometheus scrape state, plus Actuator health endpoints | Separate application unavailability from request-level failures. |

For latency calculations, prefer Prometheus histogram queries over single
request samples. For example, p95 latency can be derived from
`http_server_requests_seconds_bucket` once a Prometheus server is introduced:

```promql
histogram_quantile(
  0.95,
  sum(rate(http_server_requests_seconds_bucket{application="lined-backend"}[5m]))
    by (le, uri, method)
)
```

## Baseline Limitations

- The baseline only exposes application metrics; it does not persist scrape
  history by itself.
- Resource metrics from Kubernetes, such as pod CPU and memory usage, require
  Kubernetes metrics-server, cAdvisor, Prometheus, or another collector.
- OpenTelemetry export remains disabled in the kind Deployment until a later
  telemetry pipeline task defines the collector and trace/span storage.
- Metrics are local-experiment evidence, not production security boundaries.
  The current MVP exposes Actuator endpoints for local research convenience.
