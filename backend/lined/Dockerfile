# syntax=docker/dockerfile:1

# Build the Spring Boot executable jar with the Gradle wrapper and project
# inputs needed for compilation, resource processing, and quality configuration.
FROM eclipse-temurin:21-jdk-jammy AS build

WORKDIR /workspace

COPY gradlew .
COPY gradle gradle
COPY build.gradle settings.gradle gradle.properties ./
COPY config config
COPY src src

RUN --mount=type=cache,target=/root/.gradle ./gradlew bootJar

# Extract Spring Boot's layered jar layout so the runtime image can cache
# stable dependencies separately from frequently changing application classes.
FROM eclipse-temurin:21-jre-jammy AS extract

WORKDIR /workspace

COPY --from=build /workspace/build/libs/*.jar app.jar

RUN java -Djarmode=layertools -jar app.jar extract --destination extracted

# Create the final Java 21 runtime image. It contains no build tools and runs
# the backend under an unprivileged user.
FROM eclipse-temurin:21-jre-jammy AS runtime

ARG UID=10001

RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/nonexistent" \
    --shell "/usr/sbin/nologin" \
    --no-create-home \
    --uid "${UID}" \
    appuser

WORKDIR /application

# Copy Spring Boot layers in cache-friendly order: dependencies first, then the
# boot loader, snapshot dependencies, and finally application code/resources.
COPY --from=extract /workspace/extracted/dependencies/ ./
COPY --from=extract /workspace/extracted/spring-boot-loader/ ./
COPY --from=extract /workspace/extracted/snapshot-dependencies/ ./
COPY --from=extract /workspace/extracted/application/ ./

USER appuser

# Keep runtime configuration external through Spring Boot environment variables.
EXPOSE 8080

ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
