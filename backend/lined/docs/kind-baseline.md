# kind Backend Baseline

This guide describes the minimal local Kubernetes baseline for the Lined
backend experiment task `experiment/kind-postgres-backend-baseline`.

The baseline runs PostgreSQL 15 and the existing Spring Boot backend image in a
local kind cluster. It preserves backend business behavior and verifies the
deployment through Spring Boot Actuator health.

## Prerequisites

- Docker Desktop or another Docker daemon running locally.
- `kind` installed and available on `PATH`.
- `kubectl` installed and pointed at the target kind cluster.

## Create or Select a kind Cluster

If you do not already have a kind cluster, create one:

```bash
kind create cluster --name lined
```

If you use a named cluster, make sure `kubectl` is using it:

```bash
kubectl config use-context kind-lined
```

## Build and Load the Backend Image

Run from `backend/lined/`:

```bash
docker build -t lined-backend:local .
kind load docker-image lined-backend:local --name lined
```

If you are using the default kind cluster name, omit `--name lined`:

```bash
kind load docker-image lined-backend:local
```

The backend Deployment uses `imagePullPolicy: IfNotPresent`, so the local image
loaded into kind is used without requiring a container registry.

## Apply the Baseline Manifests

Run from `backend/lined/`:

```bash
kubectl apply -k k8s/kind
```

Wait for PostgreSQL and the backend to roll out:

```bash
kubectl -n lined rollout status deployment/lined-postgres
kubectl -n lined rollout status deployment/lined-backend
```

Inspect pods if either rollout does not complete:

```bash
kubectl -n lined get pods
kubectl -n lined logs deployment/lined-postgres
kubectl -n lined logs deployment/lined-backend
```

## Verify Health

Forward the backend Service to localhost:

```bash
kubectl -n lined port-forward svc/lined-backend 8080:8080
```

In another terminal, verify Actuator health:

```bash
curl http://localhost:8080/actuator/health
```

Expected result:

```json
{"status":"UP"}
```

The exact response can include health details because the backend exposes
Actuator health details in local experiment configuration.

## Configuration Notes

- Namespace: `lined`
- Backend image: `lined-backend:local`
- PostgreSQL image: `postgres:15`
- PostgreSQL Service: `lined-postgres:5432`
- Backend Service: `lined-backend:8080`
- Database credentials are stored in the local-only Kubernetes Secret
  `lined-postgres` with username `postgres`, password `postgres`, and database
  `lineddb`.
- The backend pod sets `OTEL_SDK_DISABLED=true` because telemetry collection is
  introduced by a later experiment task.

## Cleanup

Delete the baseline resources:

```bash
kubectl delete -k k8s/kind
```

Delete the whole local cluster if it was created only for this experiment:

```bash
kind delete cluster --name lined
```
