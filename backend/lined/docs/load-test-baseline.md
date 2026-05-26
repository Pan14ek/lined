# Load-Test Baseline

This guide describes the repeatable k6 workload for the Lined backend
experiment task `experiment/load-test-baseline`.

The baseline drives valid users, lobbies, tasks, and calendar workflows against
the existing local backend deployment. It is designed to produce runtime
traffic for Actuator and Prometheus metrics without changing Spring Boot
business behavior or adding a metrics collector.

## Scope

This task provides:

- A k6 script at `load-tests/k6/load-test-baseline.js`.
- A smoke workload for quick endpoint and payload validation.
- A bounded baseline workload for local kind runtime measurements.
- Synthetic setup data for users, one lobby, tasks, and events.

This task does not add a Prometheus server, dashboard, distributed k6 runner,
OpenTelemetry Collector, HPA policy, or runtime fitness calculation. Those
remain separate experiment tasks.

## Prerequisites

- Deploy the kind baseline from `docs/kind-baseline.md`.
- Keep the backend Service port-forwarded to localhost:

```bash
kubectl -n lined port-forward svc/lined-backend 8080:8080
```

- Verify readiness before running load:

```bash
curl http://localhost:8080/actuator/health/readiness
```

Expected result:

```json
{"status":"UP"}
```

## Run with Local k6

Run a one-iteration smoke check first:

```bash
k6 run \
  -e WORKLOAD=smoke \
  -e BASE_URL=http://localhost:8080 \
  load-tests/k6/load-test-baseline.js
```

Run the default baseline workload:

```bash
k6 run \
  -e WORKLOAD=baseline \
  -e BASE_URL=http://localhost:8080 \
  load-tests/k6/load-test-baseline.js
```

Run a read-heavy workload when you want mostly GET traffic against the bounded
seed data:

```bash
k6 run \
  -e WORKLOAD=read-heavy \
  -e BASE_URL=http://localhost:8080 \
  load-tests/k6/load-test-baseline.js
```

Run a write-heavy workload when you want create, update, and delete traffic
without retaining per-iteration task or event rows:

```bash
k6 run \
  -e WORKLOAD=write-heavy \
  -e BASE_URL=http://localhost:8080 \
  load-tests/k6/load-test-baseline.js
```

Run a mixed workload when you want reads, seeded updates, and bounded
create/delete writes in the same profile:

```bash
k6 run \
  -e WORKLOAD=mixed \
  -e BASE_URL=http://localhost:8080 \
  load-tests/k6/load-test-baseline.js
```

Run a stress workload when you want ramping VUs against the baseline workflow:

```bash
k6 run \
  -e WORKLOAD=stress \
  -e BASE_URL=http://localhost:8080 \
  load-tests/k6/load-test-baseline.js
```

The default baseline uses 5 virtual users for 2 minutes. Override it when a
specific experiment variant needs a different local load profile:

```bash
k6 run \
  -e WORKLOAD=baseline \
  -e BASE_URL=http://localhost:8080 \
  -e VUS=10 \
  -e DURATION=5m \
  load-tests/k6/load-test-baseline.js
```

## Run with Docker

If k6 is not installed locally, use the official Grafana k6 image from the
backend directory:

```bash
docker run --rm \
  -v "$PWD/load-tests/k6:/scripts" \
  grafana/k6 run \
  -e WORKLOAD=smoke \
  -e BASE_URL=http://host.docker.internal:8080 \
  -e ALLOW_REMOTE_BASE_URL=true \
  /scripts/load-test-baseline.js
```

`ALLOW_REMOTE_BASE_URL=true` is required here because the script defaults to
local-only targets and `host.docker.internal` is the Docker host alias.

If the Docker container cannot reach the port-forwarded backend, prefer the
local k6 command above. On an isolated development machine, an alternative is
to bind the port-forward on all host interfaces before using the Docker
command:

```bash
kubectl -n lined port-forward --address 0.0.0.0 svc/lined-backend 8080:8080
```

Use that broader bind only for local experiment work on a trusted machine.

## Workload Behavior

The script uses the backend's current MVP identity mechanism:
`X-User-Id: <id>`. It does not use JWT because the active controllers do not
require JWT authentication.

Setup creates:

- synthetic users named `k6_<RUN_ID>_<index>`
- one `FRIENDS` lobby owned by the first synthetic user
- lobby memberships for the other synthetic users
- a bounded task corpus
- a bounded event corpus

The measured loop is intentionally stable. It reads users and lobbies, updates
seeded tasks, lists tasks with bounded filters, lists seeded events, and calls
calendar conflict endpoints against the bounded event window. It does not keep
adding tasks or events during the measured loop, because unbounded local data
growth would distort latency measurements.

Teardown deletes the seeded events and tasks before deleting the seeded lobby.
The explicit delete order keeps cleanup independent of whether the local
database constraints were created from `schema.sql` cascades or from JPA
`ddl-auto=update`. Synthetic users remain because the backend currently exposes
no user delete endpoint. For clean repeated experiments, reset the local kind
database or recreate the kind baseline when retained `k6_` users are no longer
useful.

## Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `BASE_URL` | `http://localhost:8080` | Backend URL reached through local port-forwarding. |
| `WORKLOAD` | `baseline` | `smoke`, `baseline`, `read-heavy`, `write-heavy`, `mixed`, or `stress`. |
| `RUN_ID` | current timestamp | Prefix used for synthetic users and seeded data. |
| `USER_COUNT` | `4` | Synthetic users created during setup; minimum `2`. |
| `SEED_TASK_COUNT` | `12` | Seeded tasks in the bounded task corpus; minimum `2`. |
| `SEED_EVENT_COUNT` | `8` | Seeded events in the bounded event corpus; minimum `2`. |
| `VUS` | `5` | Virtual users for the baseline workload. |
| `DURATION` | `2m` | Duration for the baseline workload. |
| `STRESS_MAX_VUS` | `20` | Maximum virtual users for the stress workload; minimum `2`. |
| `STRESS_STAGE_DURATION` | `30s` | Duration of each stress ramp stage. |
| `THINK_TIME_SECONDS` | `1` | Sleep between workflow iterations. |
| `ALLOW_REMOTE_BASE_URL` | `false` | Must be `true` for intentional non-local targets. |

The script rejects malformed numeric values and unknown workload names so a
mistyped smoke run does not silently become a longer baseline run.

## Expected k6 Signals

The k6 summary should include:

- `checks` pass rate
- `http_req_failed`
- `http_req_duration`
- request counts and throughput

The script also attaches request tags for `domain`, `endpoint`, and `workload`.
Those tags are available to k6 outputs that preserve tag dimensions; the
default terminal summary reports aggregate metrics.

The baseline thresholds are conservative local experiment guardrails:

```text
checks > 99%
http_req_failed < 1%
http_req_duration p95 < 1000ms
http_req_duration p99 < 2000ms
```

Treat these thresholds as a reproducibility guard, not as product SLOs.

## Verify Runtime Metrics

After a smoke or baseline run, query Prometheus-format Actuator metrics:

```bash
curl http://localhost:8080/actuator/prometheus | grep http_server_requests_seconds
```

Expected result:

- `http_server_requests_seconds_count` increases for API and Actuator routes.
- `http_server_requests_seconds_bucket` is present for latency histogram
  analysis.
- Labels include request method, status, outcome, and URI from Spring Boot
  Actuator.

See `docs/runtime-metrics-baseline.md` for the runtime signal map and the
Prometheus query direction for later experiment tasks.

## Safety Notes

- Use the default local target for normal experiment runs.
- Set `ALLOW_REMOTE_BASE_URL=true` only for an intentional Docker-host or
  controlled non-local target.
- Do not point this workload at shared or production environments.
- Do not commit generated k6 output files unless a future task explicitly adds
  sanitized experiment snapshots.
