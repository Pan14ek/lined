import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {describe, it, type TestContext} from "node:test";

import {
    collectRuntimeOnlyMetrics,
    parseRuntimeMetrics,
    readRuntimeMetrics,
    writeMetricsOutput,
} from "./collectMetrics";
import {
    classifyRuntimeMetrics,
    computeRuntimeFitness,
    parseSloThresholds,
} from "./runtimeScoring";

const RUNTIME_SCHEMA_VERSION = 1;
const UNSUPPORTED_RUNTIME_SCHEMA_VERSION = 2;
const RUNTIME_SCORE_VERSION = "runtime-aware-v1";
const THRESHOLD_VERSION = "slo-thresholds-v1";

const SCENARIO_FIXED_MEDIUM = "fixed-medium";
const SCENARIO_FIXED_SMALL = "fixed-small";
const SCENARIO_REPLICAS_2 = "replicas-2";
const WORKLOAD_BASELINE = "baseline";
const WORKLOAD_SMOKE = "smoke";
const SOURCE_LOCAL_KIND = "local-kind";

const LOCAL_BRANCH = "experiment-runtime-aware-scoring";
const LOCAL_COMMIT = "abc123";
const LOCAL_METRICS_DOCUMENT_ID = `${LOCAL_BRANCH}-${LOCAL_COMMIT}`;
const ISO_TIMESTAMP = "2026-06-04T00:00:00.000Z";

const SUMMARY_LATENCY_P95_MS = 250.5;
const SUMMARY_LATENCY_P99_MS = 550.25;
const SUMMARY_ERROR_RATE = 0.002;
const SUMMARY_THROUGHPUT_RPS = 42.1;
const SUMMARY_AVAILABILITY = 1;
const SUMMARY_RESTART_COUNT = 0;
const SUMMARY_CPU_UTILIZATION = 0.62;
const SUMMARY_MEMORY_UTILIZATION = 0.71;
const SUMMARY_HPA_DESIRED_REPLICAS = 2;
const SUMMARY_HPA_CURRENT_REPLICAS = 2;
const MISSING_PROCESS_CPU_USAGE = "process_cpu_usage";

const BASELINE_LATENCY_P95_MS = 300;
const BASELINE_LATENCY_P99_MS = 600;
const BASELINE_ERROR_RATE = 0.004;
const BASELINE_THROUGHPUT_RPS = 40;
const BASELINE_AVAILABILITY = 0.99;
const BASELINE_RESTART_COUNT = 1;
const BASELINE_CPU_UTILIZATION = 0.7;
const BASELINE_MEMORY_UTILIZATION = 0.8;

const CURRENT_LATENCY_P95_MS = 240;
const CURRENT_LATENCY_P99_MS = 480;
const CURRENT_ERROR_RATE = 0.002;
const CURRENT_THROUGHPUT_RPS = 44;
const CURRENT_AVAILABILITY = 1;
const CURRENT_RESTART_COUNT = 0;
const CURRENT_CPU_UTILIZATION = 0.63;
const CURRENT_MEMORY_UTILIZATION = 0.72;

const EXPECTED_RUNTIME_SCORE = 0.2915;
const EXPECTED_LATENCY_P95_WEIGHT = 0.2;
const EXPECTED_LATENCY_P95_DELTA = 0.2;
const EXPECTED_ERROR_ONLY_SCORE = 0.5;
const EXPECTED_ZERO_BASELINE_SCORE = -0.1429;
const EXPECTED_WRITTEN_STRUCTURAL_SCORE = 0.42;
const EXPECTED_WRITTEN_RUNTIME_SCORE = 0.25;
const STRUCTURAL_METRIC_ZERO = 0;
const STRUCTURAL_SPOTBUGS_CLASS_COUNT = 1;
const EXPECTED_CONSTRAINT_CLASSIFICATIONS = ["invalid", "valid", "warning", "unknown"];
const INVALID_OUTPUT_PATH = "/path/that/does/not/exist/metrics.json";

const ERROR_ONLY_CURRENT_RATE = 0.002;
const ERROR_ONLY_BASELINE_RATE = 0.004;
const ZERO_BASELINE_CURRENT_THROUGHPUT = 10;
const ZERO_BASELINE_CURRENT_ERROR_RATE = 0.1;
const CLASSIFICATION_INVALID_LATENCY_P95_MS = 1200;
const CLASSIFICATION_VALID_ERROR_RATE = 0;
const CLASSIFICATION_WARNING_CPU_UTILIZATION = 0.9;

const THRESHOLD_LATENCY_P95_LIMIT_MS = 1000;
const THRESHOLD_ERROR_RATE_LIMIT = 0.01;
const THRESHOLD_CPU_WARNING_LIMIT = 0.85;

type RuntimePayload = {
    schema_version: number;
    scenario: string;
    workload: string;
    source: string;
    summary: Record<string, unknown>;
    missing?: string[];
};

// Full collector-ready summary: every field documents a runtime metric contract
// consumed by parseRuntimeMetrics, including HPA replica counts as context only.
const FULL_RUNTIME_PAYLOAD: RuntimePayload = {
    schema_version: RUNTIME_SCHEMA_VERSION,
    scenario: SCENARIO_FIXED_MEDIUM,
    workload: WORKLOAD_BASELINE,
    source: SOURCE_LOCAL_KIND,
    summary: {
        latency_p95_ms: SUMMARY_LATENCY_P95_MS,
        latency_p99_ms: SUMMARY_LATENCY_P99_MS,
        error_rate: SUMMARY_ERROR_RATE,
        throughput_rps: SUMMARY_THROUGHPUT_RPS,
        availability: SUMMARY_AVAILABILITY,
        restart_count: SUMMARY_RESTART_COUNT,
        cpu_utilization: SUMMARY_CPU_UTILIZATION,
        memory_utilization: SUMMARY_MEMORY_UTILIZATION,
        hpa_desired_replicas: SUMMARY_HPA_DESIRED_REPLICAS,
        hpa_current_replicas: SUMMARY_HPA_CURRENT_REPLICAS,
    },
    missing: [MISSING_PROCESS_CPU_USAGE],
};

// Baseline fixture represents the stable scenario used as the denominator for
// normalized runtime-aware v1 scoring.
const RUNTIME_BASELINE_PAYLOAD: RuntimePayload = {
    schema_version: RUNTIME_SCHEMA_VERSION,
    scenario: SCENARIO_FIXED_MEDIUM,
    workload: WORKLOAD_BASELINE,
    source: SOURCE_LOCAL_KIND,
    summary: {
        latency_p95_ms: BASELINE_LATENCY_P95_MS,
        latency_p99_ms: BASELINE_LATENCY_P99_MS,
        error_rate: BASELINE_ERROR_RATE,
        throughput_rps: BASELINE_THROUGHPUT_RPS,
        availability: BASELINE_AVAILABILITY,
        restart_count: BASELINE_RESTART_COUNT,
        cpu_utilization: BASELINE_CPU_UTILIZATION,
        memory_utilization: BASELINE_MEMORY_UTILIZATION,
    },
};

// Current fixture represents an improved deployment scenario compared with the
// baseline fixture while keeping the workload and source fixed.
const RUNTIME_CURRENT_PAYLOAD: RuntimePayload = {
    schema_version: RUNTIME_SCHEMA_VERSION,
    scenario: SCENARIO_REPLICAS_2,
    workload: WORKLOAD_BASELINE,
    source: SOURCE_LOCAL_KIND,
    summary: {
        latency_p95_ms: CURRENT_LATENCY_P95_MS,
        latency_p99_ms: CURRENT_LATENCY_P99_MS,
        error_rate: CURRENT_ERROR_RATE,
        throughput_rps: CURRENT_THROUGHPUT_RPS,
        availability: CURRENT_AVAILABILITY,
        restart_count: CURRENT_RESTART_COUNT,
        cpu_utilization: CURRENT_CPU_UTILIZATION,
        memory_utilization: CURRENT_MEMORY_UTILIZATION,
    },
};

// Threshold fixture mirrors slo-thresholds-v1 rule categories: hard invalid
// constraints, warning-only pressure, and external readiness evidence.
const SLO_THRESHOLDS_PAYLOAD = {
    threshold_version: THRESHOLD_VERSION,
    thresholds: [
        {
            id: "latency-p95-local",
            metric: "latency_p95_ms",
            operator: "<=",
            value: THRESHOLD_LATENCY_P95_LIMIT_MS,
            severity: "invalid",
        },
        {
            id: "error-rate-local",
            metric: "error_rate",
            operator: "<=",
            value: THRESHOLD_ERROR_RATE_LIMIT,
            severity: "invalid",
        },
        {
            id: "cpu-pressure-local",
            metric: "cpu_utilization",
            operator: ">",
            value: THRESHOLD_CPU_WARNING_LIMIT,
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
};

const OPTIONAL_FIELD_PAYLOAD: RuntimePayload = {
    schema_version: RUNTIME_SCHEMA_VERSION,
    scenario: SCENARIO_FIXED_SMALL,
    workload: WORKLOAD_SMOKE,
    source: SOURCE_LOCAL_KIND,
    summary: {
        error_rate: 0,
    },
};

const UNSUPPORTED_SCHEMA_PAYLOAD: RuntimePayload = {
    schema_version: UNSUPPORTED_RUNTIME_SCHEMA_VERSION,
    scenario: SCENARIO_FIXED_MEDIUM,
    workload: WORKLOAD_BASELINE,
    source: SOURCE_LOCAL_KIND,
    summary: {},
};

const BLANK_SCENARIO_PAYLOAD: RuntimePayload = {
    schema_version: RUNTIME_SCHEMA_VERSION,
    scenario: " ",
    workload: WORKLOAD_BASELINE,
    source: SOURCE_LOCAL_KIND,
    summary: {},
};

const NON_NUMERIC_LATENCY_PAYLOAD: RuntimePayload = {
    schema_version: RUNTIME_SCHEMA_VERSION,
    scenario: SCENARIO_FIXED_MEDIUM,
    workload: WORKLOAD_BASELINE,
    source: SOURCE_LOCAL_KIND,
    summary: {
        latency_p95_ms: "250",
    },
};

const NEGATIVE_RESTART_PAYLOAD: RuntimePayload = {
    schema_version: RUNTIME_SCHEMA_VERSION,
    scenario: SCENARIO_FIXED_MEDIUM,
    workload: WORKLOAD_BASELINE,
    source: SOURCE_LOCAL_KIND,
    summary: {
        restart_count: -1,
    },
};

const OUT_OF_RANGE_ERROR_RATE_PAYLOAD: RuntimePayload = {
    schema_version: RUNTIME_SCHEMA_VERSION,
    scenario: SCENARIO_FIXED_MEDIUM,
    workload: WORKLOAD_BASELINE,
    source: SOURCE_LOCAL_KIND,
    summary: {
        error_rate: 1.1,
    },
};

const INVALID_MISSING_FIELD_PAYLOAD = {
    schema_version: RUNTIME_SCHEMA_VERSION,
    scenario: SCENARIO_FIXED_MEDIUM,
    workload: WORKLOAD_BASELINE,
    source: SOURCE_LOCAL_KIND,
    summary: {},
    missing: ["availability", 42],
};

const ERROR_ONLY_CURRENT_PAYLOAD: RuntimePayload = {
    schema_version: RUNTIME_SCHEMA_VERSION,
    scenario: SCENARIO_REPLICAS_2,
    workload: WORKLOAD_BASELINE,
    source: SOURCE_LOCAL_KIND,
    summary: {
        error_rate: ERROR_ONLY_CURRENT_RATE,
    },
};

const ERROR_ONLY_BASELINE_PAYLOAD: RuntimePayload = {
    schema_version: RUNTIME_SCHEMA_VERSION,
    scenario: SCENARIO_FIXED_MEDIUM,
    workload: WORKLOAD_BASELINE,
    source: SOURCE_LOCAL_KIND,
    summary: {
        error_rate: ERROR_ONLY_BASELINE_RATE,
        latency_p95_ms: BASELINE_LATENCY_P95_MS,
    },
};

const ZERO_BASELINE_CURRENT_PAYLOAD: RuntimePayload = {
    schema_version: RUNTIME_SCHEMA_VERSION,
    scenario: SCENARIO_REPLICAS_2,
    workload: WORKLOAD_BASELINE,
    source: SOURCE_LOCAL_KIND,
    summary: {
        throughput_rps: ZERO_BASELINE_CURRENT_THROUGHPUT,
        error_rate: ZERO_BASELINE_CURRENT_ERROR_RATE,
    },
};

const ZERO_BASELINE_PAYLOAD: RuntimePayload = {
    schema_version: RUNTIME_SCHEMA_VERSION,
    scenario: SCENARIO_FIXED_MEDIUM,
    workload: WORKLOAD_BASELINE,
    source: SOURCE_LOCAL_KIND,
    summary: {
        throughput_rps: 0,
        error_rate: 0,
    },
};

const CLASSIFICATION_RUNTIME_PAYLOAD: RuntimePayload = {
    schema_version: RUNTIME_SCHEMA_VERSION,
    scenario: SCENARIO_FIXED_MEDIUM,
    workload: WORKLOAD_BASELINE,
    source: SOURCE_LOCAL_KIND,
    summary: {
        latency_p95_ms: CLASSIFICATION_INVALID_LATENCY_P95_MS,
        error_rate: CLASSIFICATION_VALID_ERROR_RATE,
        cpu_utilization: CLASSIFICATION_WARNING_CPU_UTILIZATION,
    },
};

const runtimeJson = (payload: unknown): string => JSON.stringify(payload);

const validRuntimeMetricsJson = runtimeJson(FULL_RUNTIME_PAYLOAD);
const runtimeBaselineMetrics = parseRuntimeMetrics(runtimeJson(RUNTIME_BASELINE_PAYLOAD));
const runtimeCurrentMetrics = parseRuntimeMetrics(runtimeJson(RUNTIME_CURRENT_PAYLOAD));
const sloThresholdsJson = runtimeJson(SLO_THRESHOLDS_PAYLOAD);

describe("parseRuntimeMetrics", () => {
    it("parses a valid summarized runtime metrics document", (t: TestContext) => {
        t.plan(1);

        const result = parseRuntimeMetrics(validRuntimeMetricsJson);

        t.assert.deepStrictEqual(result, FULL_RUNTIME_PAYLOAD);
    });

    it("accepts a summary with omitted optional metric fields", (t: TestContext) => {
        t.plan(1);

        const result = parseRuntimeMetrics(runtimeJson(OPTIONAL_FIELD_PAYLOAD));

        t.assert.deepStrictEqual(result, {
            ...OPTIONAL_FIELD_PAYLOAD,
            missing: undefined,
        });
    });

    it("rejects unsupported schema versions", (t: TestContext) => {
        t.plan(1);

        t.assert.throws(
            () => parseRuntimeMetrics(runtimeJson(UNSUPPORTED_SCHEMA_PAYLOAD)),
            /schema_version must be 1/
        );
    });

    it("rejects missing or blank required string fields", (t: TestContext) => {
        t.plan(1);

        t.assert.throws(
            () => parseRuntimeMetrics(runtimeJson(BLANK_SCENARIO_PAYLOAD)),
            /scenario must be a non-empty string/
        );
    });

    it("rejects non-numeric summary fields", (t: TestContext) => {
        t.plan(1);

        t.assert.throws(
            () => parseRuntimeMetrics(runtimeJson(NON_NUMERIC_LATENCY_PAYLOAD)),
            /summary\.latency_p95_ms must be a finite number/
        );
    });

    it("rejects negative count and duration fields", (t: TestContext) => {
        t.plan(1);

        t.assert.throws(
            () => parseRuntimeMetrics(runtimeJson(NEGATIVE_RESTART_PAYLOAD)),
            /summary\.restart_count must be >= 0/
        );
    });

    it("rejects ratio fields greater than one", (t: TestContext) => {
        t.plan(1);

        t.assert.throws(
            () => parseRuntimeMetrics(runtimeJson(OUT_OF_RANGE_ERROR_RATE_PAYLOAD)),
            /summary\.error_rate must be <= 1/
        );
    });

    it("rejects non-string missing field names", (t: TestContext) => {
        t.plan(1);

        t.assert.throws(
            () => parseRuntimeMetrics(runtimeJson(INVALID_MISSING_FIELD_PAYLOAD)),
            /missing\[1\] must be a non-empty string/
        );
    });
});

describe("readRuntimeMetrics", () => {
    it("returns undefined when no path is provided", (t: TestContext) => {
        t.plan(2);

        t.assert.strictEqual(readRuntimeMetrics(), undefined);
        t.assert.strictEqual(readRuntimeMetrics(" "), undefined);
    });

    it("reads and parses a runtime metrics JSON file", (t: TestContext) => {
        t.plan(3);

        const directory = fs.mkdtempSync(path.join(os.tmpdir(), "lined-runtime-"));
        const file = path.join(directory, "runtime-summary.json");

        try {
            fs.writeFileSync(file, validRuntimeMetricsJson, "utf-8");

            const result = readRuntimeMetrics(file);

            t.assert.strictEqual(result?.schema_version, RUNTIME_SCHEMA_VERSION);
            t.assert.strictEqual(result?.scenario, SCENARIO_FIXED_MEDIUM);
            t.assert.strictEqual(result?.summary.latency_p95_ms, SUMMARY_LATENCY_P95_MS);
        } finally {
            fs.rmSync(directory, {recursive: true, force: true});
        }
    });
});

describe("computeRuntimeFitness", () => {
    it("does not emit runtime metadata when no current runtime input exists", (t: TestContext) => {
        t.plan(1);

        const result = computeRuntimeFitness();

        t.assert.deepStrictEqual(result, {
            runtimeFitnessScore: null,
            runtimeFitnessScoreVersion: RUNTIME_SCORE_VERSION,
        });
    });

    it("computes a runtime-aware score from current and baseline summaries", (t: TestContext) => {
        t.plan(6);

        const result = computeRuntimeFitness(runtimeCurrentMetrics, runtimeBaselineMetrics);

        t.assert.strictEqual(result.runtimeFitnessScoreVersion, RUNTIME_SCORE_VERSION);
        t.assert.strictEqual(result.runtimeFitnessScore, EXPECTED_RUNTIME_SCORE);
        t.assert.strictEqual(result.runtimeFitness?.current.scenario, SCENARIO_REPLICAS_2);
        t.assert.strictEqual(result.runtimeFitness?.baseline?.scenario, SCENARIO_FIXED_MEDIUM);
        t.assert.strictEqual(
            result.runtimeFitness?.activeMetricWeights.latency_p95_ms,
            EXPECTED_LATENCY_P95_WEIGHT
        );
        t.assert.strictEqual(
            result.runtimeFitness?.normalizedDeltas.latency_p95_ms?.normalizedDelta,
            EXPECTED_LATENCY_P95_DELTA
        );
    });

    it("marks runtime evidence ineligible when the comparison baseline is missing", (
        t: TestContext
    ) => {
        t.plan(3);

        const result = computeRuntimeFitness(runtimeCurrentMetrics, undefined, {
            thresholdVersion: THRESHOLD_VERSION,
            constraints: [],
            hasInvalidHardConstraint: false,
            hasUnknownHardConstraint: false,
            eligibleForStableComparison: true,
        });

        t.assert.strictEqual(result.runtimeFitnessScore, null);
        t.assert.strictEqual(result.runtimeFitness?.eligibleForStableComparison, false);
        t.assert.strictEqual(
            result.runtimeFitness?.reason,
            "runtime baseline metrics are not available"
        );
    });

    it("omits missing runtime metrics and re-normalizes active weights", (t: TestContext) => {
        t.plan(3);

        const current = parseRuntimeMetrics(runtimeJson(ERROR_ONLY_CURRENT_PAYLOAD));
        const baseline = parseRuntimeMetrics(runtimeJson(ERROR_ONLY_BASELINE_PAYLOAD));

        const result = computeRuntimeFitness(current, baseline);

        t.assert.strictEqual(result.runtimeFitnessScore, EXPECTED_ERROR_ONLY_SCORE);
        t.assert.deepStrictEqual(result.runtimeFitness?.activeMetricWeights, {
            error_rate: 1,
        });
        t.assert.ok(
            result.runtimeFitness?.missingMetrics.includes("current.summary.latency_p95_ms")
        );
    });

    it("handles zero baselines with documented normalization rules", (t: TestContext) => {
        t.plan(3);

        const current = parseRuntimeMetrics(runtimeJson(ZERO_BASELINE_CURRENT_PAYLOAD));
        const baseline = parseRuntimeMetrics(runtimeJson(ZERO_BASELINE_PAYLOAD));

        const result = computeRuntimeFitness(current, baseline);

        t.assert.strictEqual(result.runtimeFitnessScore, EXPECTED_ZERO_BASELINE_SCORE);
        t.assert.strictEqual(
            result.runtimeFitness?.normalizedDeltas.throughput_rps?.normalizedDelta,
            1
        );
        t.assert.strictEqual(
            result.runtimeFitness?.normalizedDeltas.error_rate?.normalizedDelta,
            -1
        );
    });
});

describe("classifyRuntimeMetrics", () => {
    it("classifies valid, warning, invalid, and unknown runtime evidence", (t: TestContext) => {
        t.plan(5);

        const thresholds = parseSloThresholds(sloThresholdsJson);
        const runtime = parseRuntimeMetrics(runtimeJson(CLASSIFICATION_RUNTIME_PAYLOAD));

        const result = classifyRuntimeMetrics(runtime, thresholds);

        t.assert.strictEqual(result.thresholdVersion, THRESHOLD_VERSION);
        t.assert.strictEqual(result.eligibleForStableComparison, false);
        t.assert.strictEqual(result.hasInvalidHardConstraint, true);
        t.assert.strictEqual(result.hasUnknownHardConstraint, true);
        t.assert.deepStrictEqual(
            result.constraints.map((constraint) => constraint.classification),
            EXPECTED_CONSTRAINT_CLASSIFICATIONS
        );
    });
});

describe("writeMetricsOutput", () => {
    it("writes a local final metrics document without a database", (t: TestContext) => {
        t.plan(3);

        const directory = fs.mkdtempSync(path.join(os.tmpdir(), "lined-metrics-output-"));
        const file = path.join(directory, "metrics.json");

        try {
            writeMetricsOutput(file, {
                id: LOCAL_METRICS_DOCUMENT_ID,
                timestamp: ISO_TIMESTAMP,
                branch: LOCAL_BRANCH,
                commitHash: LOCAL_COMMIT,
                metrics: {
                    checkstyle_violations: STRUCTURAL_METRIC_ZERO,
                    spotbugs_total: STRUCTURAL_METRIC_ZERO,
                    spotbugs_total_classes: STRUCTURAL_SPOTBUGS_CLASS_COUNT,
                },
                fitnessScore: EXPECTED_WRITTEN_STRUCTURAL_SCORE,
                runtimeFitnessScore: EXPECTED_WRITTEN_RUNTIME_SCORE,
                runtimeFitnessScoreVersion: RUNTIME_SCORE_VERSION,
            });

            const written = JSON.parse(fs.readFileSync(file, "utf-8"));
            t.assert.strictEqual(written.fitnessScore, EXPECTED_WRITTEN_STRUCTURAL_SCORE);
            t.assert.strictEqual(written.runtimeFitnessScore, EXPECTED_WRITTEN_RUNTIME_SCORE);
            t.assert.strictEqual(written.runtimeFitnessScoreVersion, RUNTIME_SCORE_VERSION);
        } finally {
            fs.rmSync(directory, {recursive: true, force: true});
        }
    });

    it("throws when the output path cannot be written", (t: TestContext) => {
        t.plan(1);

        t.assert.throws(
            () => writeMetricsOutput(INVALID_OUTPUT_PATH, {
                id: LOCAL_METRICS_DOCUMENT_ID,
                timestamp: ISO_TIMESTAMP,
                branch: LOCAL_BRANCH,
                commitHash: LOCAL_COMMIT,
                metrics: {},
                fitnessScore: null,
                runtimeFitnessScore: null,
                runtimeFitnessScoreVersion: RUNTIME_SCORE_VERSION,
            }),
            /ENOENT/
        );
    });
});

describe("collectRuntimeOnlyMetrics", () => {
    it("requires a runtime metrics JSON path", (t: TestContext) => {
        t.plan(1);

        t.assert.throws(
            () => collectRuntimeOnlyMetrics({
                checkstylePath: "",
                spotbugsXmlPath: "",
                spotbugsHtmlPath: "",
                jacocoPath: "",
                runtimeBaselineScenario: SCENARIO_FIXED_MEDIUM,
                runtimeOnly: true,
                sloThresholdsJsonPath: "",
            }),
            /RUNTIME_ONLY=true requires RUNTIME_METRICS_JSON/
        );
    });
});
