# Backend Containerization

This guide describes how to build and run the Lined Spring Boot backend as a
local Docker image for experiment work.

The image uses the existing Gradle `bootJar` output and Spring Boot layered jar
metadata. It does not change backend business behavior or replace the later
kind/Kubernetes baseline task.

## Build the Image

Run from `backend/lined/`:

```bash
docker build -t lined-backend:local .
```

The Dockerfile builds the executable jar, extracts Spring Boot layers, and
copies those layers into a Java 17 runtime image. The final container runs as a
non-root user and listens on port `8080`.

## Run with Local PostgreSQL

Start PostgreSQL on the host first. The backend expects database `lineddb` with
user `postgres` and password `postgres`, matching the local development setup.

For Docker Desktop, run:

```bash
docker run --rm \
  -p 8080:8080 \
  -e SPRING_DATASOURCE_URL=jdbc:postgresql://host.docker.internal:5432/lineddb?options=-c%20TimeZone=UTC \
  -e SPRING_DATASOURCE_USERNAME=postgres \
  -e SPRING_DATASOURCE_PASSWORD=postgres \
  lined-backend:local
```

Use environment variables for runtime configuration instead of baking local
database values into the image.

## Verify the Container

After the container starts, verify the backend from the host:

```bash
curl http://localhost:8080/actuator/health
curl http://localhost:8080/swagger-ui.html
```

The health endpoint should report the application status. Swagger UI should
remain available at the same path as the local `bootRun` workflow.

## Scope Boundary

This task only adds the reproducible backend image and local build/run flow.
Kubernetes manifests, kind cluster setup, and in-cluster PostgreSQL deployment
belong to `experiment/kind-postgres-backend-baseline`.
