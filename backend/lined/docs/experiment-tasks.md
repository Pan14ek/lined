# Experiment Tasks

Use one pull request per task. Use the `experiment/` branch prefix for all
scientific experiment work.

| Branch name | Name | Detailed description | What should we expect as a final work |
| --- | --- | --- | --- |
| `experiment/backend-docs-foundation` | Backend docs and agent routing foundation | Add backend `AGENTS.md`, docs index, architecture/testing docs, and move API docs. | Agents can navigate backend rules and documentation without reading the whole repo. |
| `experiment/backend-containerization` | Backend Docker image | Add Dockerfile and documented image build/run flow for Spring Boot backend. | Backend can be built as a container image reproducibly. |
| `experiment/kind-postgres-backend-baseline` | Minimal kind deployment | Add Kubernetes manifests for PostgreSQL and backend baseline deployment. | Backend runs in local kind cluster and exposes health endpoint. |
| `experiment/backend-health-probes` | Kubernetes health probes | Add readiness/liveness probe configuration using Actuator endpoints. | Kubernetes can detect backend readiness and restart unhealthy pods. |
| `experiment/runtime-metrics-baseline` | Runtime metrics baseline | Expose Prometheus-compatible backend metrics and document key runtime signals. | `/actuator/prometheus` can be collected for latency/error/resource analysis. |
| `experiment/load-test-baseline` | Load-test baseline | Add first k6 or JMeter scenarios for users/lobbies/tasks/events workflows. | Repeatable workload produces runtime metrics for baseline deployment. |
| `experiment/hpa-resource-scenarios` | HPA and resource scenarios | Add deployment variants for replicas, CPU/memory requests/limits, and HPA behavior. | Experiments can compare deployment/runtime trade-offs. |
| `experiment/fitness-runtime-extension` | Runtime fitness extension | Extend experiment documentation and/or collector design to include telemetry metrics. | Fixed CI fitness can be compared with runtime-aware adaptive fitness. |
