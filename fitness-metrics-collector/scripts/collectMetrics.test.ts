import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {describe, it} from "node:test";

import {
    classifyRuntimeMetrics,
    computeRuntimeFitness,
    parseRuntimeMetrics,
    parseSloThresholds,
    readRuntimeMetrics,
    writeMetricsOutput,
} from "./collectMetrics";

const validRuntimeMetricsJson = JSON.stringify({
    schema_version: 1,
    scenario: "fixed-medium",
    workload: "baseline",
    source: "local-kind",
    summary: {
        latency_p95_ms: 250.5,
        latency_p99_ms: 550.25,
        error_rate: 0.002,
        throughput_rps: 42.1,
        availability: 1,
        restart_count: 0,
        cpu_utilization: 0.62,
        memory_utilization: 0.71,
        hpa_desired_replicas: 2,
        hpa_current_replicas: 2,
    },
    missing: ["process_cpu_usage"],
});

const runtimeBaselineMetrics = parseRuntimeMetrics(JSON.stringify({
    schema_version: 1,
    scenario: "fixed-medium",
    workload: "baseline",
    source: "local-kind",
    summary: {
        latency_p95_ms: 300,
        latency_p99_ms: 600,
        error_rate: 0.004,
        throughput_rps: 40,
        availability: 0.99,
        restart_count: 1,
        cpu_utilization: 0.7,
        memory_utilization: 0.8,
    },
}));

const runtimeCurrentMetrics = parseRuntimeMetrics(JSON.stringify({
    schema_version: 1,
    scenario: "replicas-2",
    workload: "baseline",
    source: "local-kind",
    summary: {
        latency_p95_ms: 240,
        latency_p99_ms: 480,
        error_rate: 0.002,
        throughput_rps: 44,
        availability: 1,
        restart_count: 0,
        cpu_utilization: 0.63,
        memory_utilization: 0.72,
    },
}));

const sloThresholdsJson = JSON.stringify({
    threshold_version: "slo-thresholds-v1",
    thresholds: [
        {
            id: "latency-p95-local",
            metric: "latency_p95_ms",
            operator: "<=",
            value: 1000,
            severity: "invalid",
        },
        {
            id: "error-rate-local",
            metric: "error_rate",
            operator: "<=",
            value: 0.01,
            severity: "invalid",
        },
        {
            id: "cpu-pressure-local",
            metric: "cpu_utilization",
            operator: ">",
            value: 0.85,
            severity: "warning",
        },
        {
            id: "readiness-local",
            evidence_source: "readiness_probe_or_actuator_health",
            operator: "==",
            value: true,
            severity: "invalid",
        },
    ],
});

describe("parseRuntimeMetrics", () => {
    it("parses a valid summarized runtime metrics document", () => {
        const result = parseRuntimeMetrics(validRuntimeMetricsJson);

        assert.deepEqual(result, {
            schema_version: 1,
            scenario: "fixed-medium",
            workload: "baseline",
            source: "local-kind",
            summary: {
                latency_p95_ms: 250.5,
                latency_p99_ms: 550.25,
                error_rate: 0.002,
                throughput_rps: 42.1,
                availability: 1,
                restart_count: 0,
                cpu_utilization: 0.62,
                memory_utilization: 0.71,
                hpa_desired_replicas: 2,
                hpa_current_replicas: 2,
            },
            missing: ["process_cpu_usage"],
        });
    });

    it("accepts a summary with omitted optional metric fields", () => {
        const result = parseRuntimeMetrics(JSON.stringify({
            schema_version: 1,
            scenario: "fixed-small",
            workload: "smoke",
            source: "local-kind",
            summary: {
                error_rate: 0,
            },
        }));

        assert.deepEqual(result, {
            schema_version: 1,
            scenario: "fixed-small",
            workload: "smoke",
            source: "local-kind",
            summary: {
                error_rate: 0,
            },
            missing: undefined,
        });
    });

    it("rejects unsupported schema versions", () => {
        assert.throws(
            () => parseRuntimeMetrics(JSON.stringify({
                schema_version: 2,
                scenario: "fixed-medium",
                workload: "baseline",
                source: "local-kind",
                summary: {},
            })),
            /schema_version must be 1/
        );
    });

    it("rejects missing or blank required string fields", () => {
        assert.throws(
            () => parseRuntimeMetrics(JSON.stringify({
                schema_version: 1,
                scenario: " ",
                workload: "baseline",
                source: "local-kind",
                summary: {},
            })),
            /scenario must be a non-empty string/
        );
    });

    it("rejects non-numeric summary fields", () => {
        assert.throws(
            () => parseRuntimeMetrics(JSON.stringify({
                schema_version: 1,
                scenario: "fixed-medium",
                workload: "baseline",
                source: "local-kind",
                summary: {
                    latency_p95_ms: "250",
                },
            })),
            /summary\.latency_p95_ms must be a finite number/
        );
    });

    it("rejects negative count and duration fields", () => {
        assert.throws(
            () => parseRuntimeMetrics(JSON.stringify({
                schema_version: 1,
                scenario: "fixed-medium",
                workload: "baseline",
                source: "local-kind",
                summary: {
                    restart_count: -1,
                },
            })),
            /summary\.restart_count must be >= 0/
        );
    });

    it("rejects ratio fields greater than one", () => {
        assert.throws(
            () => parseRuntimeMetrics(JSON.stringify({
                schema_version: 1,
                scenario: "fixed-medium",
                workload: "baseline",
                source: "local-kind",
                summary: {
                    error_rate: 1.1,
                },
            })),
            /summary\.error_rate must be <= 1/
        );
    });

    it("rejects non-string missing field names", () => {
        assert.throws(
            () => parseRuntimeMetrics(JSON.stringify({
                schema_version: 1,
                scenario: "fixed-medium",
                workload: "baseline",
                source: "local-kind",
                summary: {},
                missing: ["availability", 42],
            })),
            /missing\[1\] must be a non-empty string/
        );
    });
});

describe("readRuntimeMetrics", () => {
    it("returns undefined when no path is provided", () => {
        assert.equal(readRuntimeMetrics(), undefined);
        assert.equal(readRuntimeMetrics(" "), undefined);
    });

    it("reads and parses a runtime metrics JSON file", () => {
        const directory = fs.mkdtempSync(path.join(os.tmpdir(), "lined-runtime-"));
        const file = path.join(directory, "runtime-summary.json");

        try {
            fs.writeFileSync(file, validRuntimeMetricsJson, "utf-8");

            const result = readRuntimeMetrics(file);

            assert.equal(result?.schema_version, 1);
            assert.equal(result?.scenario, "fixed-medium");
            assert.equal(result?.summary.latency_p95_ms, 250.5);
        } finally {
            fs.rmSync(directory, {recursive: true, force: true});
        }
    });
});

describe("computeRuntimeFitness", () => {
    it("does not emit runtime metadata when no current runtime input exists", () => {
        const result = computeRuntimeFitness();

        assert.deepEqual(result, {
            runtimeFitnessScore: null,
            runtimeFitnessScoreVersion: "runtime-aware-v1",
        });
    });

    it("computes a runtime-aware score from current and baseline summaries", () => {
        const result = computeRuntimeFitness(runtimeCurrentMetrics, runtimeBaselineMetrics);

        assert.equal(result.runtimeFitnessScoreVersion, "runtime-aware-v1");
        assert.equal(result.runtimeFitnessScore, 0.2915);
        assert.equal(result.runtimeFitness?.current.scenario, "replicas-2");
        assert.equal(result.runtimeFitness?.baseline?.scenario, "fixed-medium");
        assert.equal(result.runtimeFitness?.activeMetricWeights.latency_p95_ms, 0.2);
        assert.equal(
            result.runtimeFitness?.normalizedDeltas.latency_p95_ms?.normalizedDelta,
            0.2
        );
    });

    it("marks runtime evidence ineligible when the comparison baseline is missing", () => {
        const result = computeRuntimeFitness(runtimeCurrentMetrics, undefined, {
            thresholdVersion: "slo-thresholds-v1",
            constraints: [],
            hasInvalidHardConstraint: false,
            hasUnknownHardConstraint: false,
            eligibleForStableComparison: true,
        });

        assert.equal(result.runtimeFitnessScore, null);
        assert.equal(result.runtimeFitness?.eligibleForStableComparison, false);
        assert.equal(result.runtimeFitness?.reason, "runtime baseline metrics are not available");
    });

    it("omits missing runtime metrics and re-normalizes active weights", () => {
        const current = parseRuntimeMetrics(JSON.stringify({
            schema_version: 1,
            scenario: "replicas-2",
            workload: "baseline",
            source: "local-kind",
            summary: {
                error_rate: 0.002,
            },
        }));
        const baseline = parseRuntimeMetrics(JSON.stringify({
            schema_version: 1,
            scenario: "fixed-medium",
            workload: "baseline",
            source: "local-kind",
            summary: {
                error_rate: 0.004,
                latency_p95_ms: 300,
            },
        }));

        const result = computeRuntimeFitness(current, baseline);

        assert.equal(result.runtimeFitnessScore, 0.5);
        assert.deepEqual(result.runtimeFitness?.activeMetricWeights, {
            error_rate: 1,
        });
        assert.ok(result.runtimeFitness?.missingMetrics.includes("current.summary.latency_p95_ms"));
    });

    it("handles zero baselines with documented normalization rules", () => {
        const current = parseRuntimeMetrics(JSON.stringify({
            schema_version: 1,
            scenario: "replicas-2",
            workload: "baseline",
            source: "local-kind",
            summary: {
                throughput_rps: 10,
                error_rate: 0.1,
            },
        }));
        const baseline = parseRuntimeMetrics(JSON.stringify({
            schema_version: 1,
            scenario: "fixed-medium",
            workload: "baseline",
            source: "local-kind",
            summary: {
                throughput_rps: 0,
                error_rate: 0,
            },
        }));

        const result = computeRuntimeFitness(current, baseline);

        assert.equal(result.runtimeFitnessScore, -0.1429);
        assert.equal(result.runtimeFitness?.normalizedDeltas.throughput_rps?.normalizedDelta, 1);
        assert.equal(result.runtimeFitness?.normalizedDeltas.error_rate?.normalizedDelta, -1);
    });
});

describe("classifyRuntimeMetrics", () => {
    it("classifies valid, warning, invalid, and unknown runtime evidence", () => {
        const thresholds = parseSloThresholds(sloThresholdsJson);
        const runtime = parseRuntimeMetrics(JSON.stringify({
            schema_version: 1,
            scenario: "fixed-medium",
            workload: "baseline",
            source: "local-kind",
            summary: {
                latency_p95_ms: 1200,
                error_rate: 0,
                cpu_utilization: 0.9,
            },
        }));

        const result = classifyRuntimeMetrics(runtime, thresholds);

        assert.equal(result.thresholdVersion, "slo-thresholds-v1");
        assert.equal(result.eligibleForStableComparison, false);
        assert.equal(result.hasInvalidHardConstraint, true);
        assert.equal(result.hasUnknownHardConstraint, true);
        assert.deepEqual(
            result.constraints.map((constraint) => constraint.classification),
            ["invalid", "valid", "warning", "unknown"]
        );
    });
});

describe("writeMetricsOutput", () => {
    it("writes a local final metrics document without a database", () => {
        const directory = fs.mkdtempSync(path.join(os.tmpdir(), "lined-metrics-output-"));
        const file = path.join(directory, "metrics.json");

        try {
            writeMetricsOutput(file, {
                id: "experiment-runtime-aware-scoring-abc123",
                timestamp: "2026-06-04T00:00:00.000Z",
                branch: "experiment-runtime-aware-scoring",
                commitHash: "abc123",
                metrics: {
                    checkstyle_violations: 0,
                    spotbugs_total: 0,
                    spotbugs_total_classes: 1,
                },
                fitnessScore: 0.42,
                runtimeFitnessScore: 0.25,
                runtimeFitnessScoreVersion: "runtime-aware-v1",
            });

            const written = JSON.parse(fs.readFileSync(file, "utf-8"));
            assert.equal(written.fitnessScore, 0.42);
            assert.equal(written.runtimeFitnessScore, 0.25);
            assert.equal(written.runtimeFitnessScoreVersion, "runtime-aware-v1");
        } finally {
            fs.rmSync(directory, {recursive: true, force: true});
        }
    });
});
