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
copies those layers into a Java 21 runtime image. The final container runs as a
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
  -e LINED_JWT_SECRET="$(openssl rand -base64 32)" \
  -e LINED_PASSWORD_RESET_TOKEN_SECRET="$(openssl rand -base64 32)" \
  lined-backend:local
```

Use environment variables for runtime configuration instead of baking local
database values or signing material into the image. `LINED_JWT_SECRET` must be a Base64-encoded
value that decodes to at least 32 random bytes; do not reuse the shown generated value or commit
it to an environment file. `LINED_PASSWORD_RESET_TOKEN_SECRET` must also be provided and must
never be committed or logged.

## Verify the Container

After the container starts, verify the backend from the host:

```bash
curl http://localhost:8080/actuator/health
curl http://localhost:8080/swagger-ui.html
```

The health endpoint should report the application status. Swagger UI should
remain available at the same path as the local `bootRun` workflow.

For a production-like run, activate the `prod` profile and provide an explicit
HTTPS CORS origin allowlist when the frontend is hosted on another origin:

```bash
docker run --rm \
  -p 8080:8080 \
  -e SPRING_PROFILES_ACTIVE=prod \
  -e LINED_JWT_SECRET="$(openssl rand -base64 32)" \
  -e LINED_PASSWORD_RESET_TOKEN_SECRET="$(openssl rand -base64 32)" \
  -e LINED_SECURITY_CORS_ALLOWED_ORIGINS=https://app.lined.test \
  lined-backend:local
```

The `prod` profile disables Swagger/OpenAPI, exposes only status-only health,
requires secure refresh cookies, requires HTTPS CORS origins, and lowers
application logging verbosity.

## Scope Boundary

This task only adds the reproducible backend image and local build/run flow.
Kubernetes manifests, kind cluster setup, and in-cluster PostgreSQL deployment
belong to `experiment/kind-postgres-backend-baseline`.
