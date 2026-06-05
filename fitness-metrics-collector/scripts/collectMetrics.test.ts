import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {describe, it, type TestContext} from "node:test";

import {
    collectRuntimeOnlyMetrics,
    parseRuntimeMetrics,
    readRuntimeMetricSet,
    readRuntimeMetrics,
    writeMetricsOutput,
} from "./collectMetrics";
import {
    computeAdaptiveFitness,
    parseAdaptiveFitnessContext,
} from "./adaptiveScoring";
import {
    classifyRuntimeMetrics,
    computeRuntimeFitness,
    parseSloThresholds,
} from "./runtimeScoring";
import {
    computeParetoOptimization,
} from "./paretoOptimization";

const RUNTIME_SCHEMA_VERSION = 1;
const UNSUPPORTED_RUNTIME_SCHEMA_VERSION = 2;
const RUNTIME_SCORE_VERSION = "runtime-aware-v1";
const ADAPTIVE_SCORE_VERSION = "adaptive-weighted-v1";
const PARETO_OPTIMIZATION_VERSION = "pareto-baseline-v1";
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
const EXPECTED_ADAPTIVE_BALANCED_SCORE = 0.325;
const EXPECTED_ADAPTIVE_WORKLOAD_SCORE = 0.2758;
const EXPECTED_ADAPTIVE_SLO_SCORE = 0.3072;
const EXPECTED_ADAPTIVE_RESOURCE_PRESSURE_SCORE = 0.2143;
const EXPECTED_LATENCY_P95_WEIGHT = 0.2;
const EXPECTED_LATENCY_P95_DELTA = 0.2;
const EXPECTED_ERROR_ONLY_SCORE = 0.5;
const EXPECTED_ZERO_BASELINE_SCORE = -0.1429;
const EXPECTED_WRITTEN_STRUCTURAL_SCORE = 0.42;
const EXPECTED_WRITTEN_RUNTIME_SCORE = 0.25;
const EXPECTED_PARETO_FIRST_FRONT_SIZE = 2;
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
const STRUCTURAL_FITNESS_SCORE = 0.42;

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

const INVALID_LATENCY_CURRENT_PAYLOAD: RuntimePayload = {
    schema_version: RUNTIME_SCHEMA_VERSION,
    scenario: SCENARIO_REPLICAS_2,
    workload: WORKLOAD_BASELINE,
    source: SOURCE_LOCAL_KIND,
    summary: {
        latency_p95_ms: CLASSIFICATION_INVALID_LATENCY_P95_MS,
    },
};

const INVALID_LATENCY_BASELINE_PAYLOAD: RuntimePayload = {
    schema_version: RUNTIME_SCHEMA_VERSION,
    scenario: SCENARIO_FIXED_MEDIUM,
    workload: WORKLOAD_BASELINE,
    source: SOURCE_LOCAL_KIND,
    summary: {
        latency_p95_ms: CLASSIFICATION_INVALID_LATENCY_P95_MS,
    },
};

const RESOURCE_PRESSURE_CURRENT_PAYLOAD: RuntimePayload = {
    schema_version: RUNTIME_SCHEMA_VERSION,
    scenario: SCENARIO_REPLICAS_2,
    workload: WORKLOAD_BASELINE,
    source: SOURCE_LOCAL_KIND,
    summary: {
        cpu_utilization: CLASSIFICATION_WARNING_CPU_UTILIZATION,
    },
};

const RESOURCE_EFFICIENT_PAYLOAD: RuntimePayload = {
    schema_version: RUNTIME_SCHEMA_VERSION,
    scenario: SCENARIO_FIXED_SMALL,
    workload: WORKLOAD_BASELINE,
    source: SOURCE_LOCAL_KIND,
    summary: {
        latency_p95_ms: 360,
        latency_p99_ms: 720,
        error_rate: 0.006,
        throughput_rps: 35,
        availability: 0.98,
        restart_count: 2,
        cpu_utilization: 0.5,
        memory_utilization: 0.55,
    },
};

const MIXED_WORKLOAD_PAYLOAD: RuntimePayload = {
    ...RUNTIME_CURRENT_PAYLOAD,
    workload: WORKLOAD_SMOKE,
};

const runtimeJson = (payload: unknown): string => JSON.stringify(payload);

const validRuntimeMetricsJson = runtimeJson(FULL_RUNTIME_PAYLOAD);
const runtimeBaselineMetrics = parseRuntimeMetrics(runtimeJson(RUNTIME_BASELINE_PAYLOAD));
const runtimeCurrentMetrics = parseRuntimeMetrics(runtimeJson(RUNTIME_CURRENT_PAYLOAD));
const sloThresholdsJson = runtimeJson(SLO_THRESHOLDS_PAYLOAD);
const runtimeFitnessMetadata = computeRuntimeFitness(
    runtimeCurrentMetrics,
    runtimeBaselineMetrics
).runtimeFitness;

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

describe("readRuntimeMetricSet", () => {
    it("reads multiple runtime summaries for Pareto comparison", (t: TestContext) => {
        t.plan(2);

        const directory = fs.mkdtempSync(path.join(os.tmpdir(), "lined-runtime-set-"));
        const baselineFile = path.join(directory, "baseline.json");
        const currentFile = path.join(directory, "current.json");

        try {
            fs.writeFileSync(baselineFile, runtimeJson(RUNTIME_BASELINE_PAYLOAD), "utf-8");
            fs.writeFileSync(currentFile, runtimeJson(RUNTIME_CURRENT_PAYLOAD), "utf-8");

            const result = readRuntimeMetricSet([baselineFile, currentFile]);

            t.assert.strictEqual(result.length, 2);
            t.assert.deepStrictEqual(
                result.map((runtime) => runtime.scenario),
                [SCENARIO_FIXED_MEDIUM, SCENARIO_REPLICAS_2]
            );
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

describe("computeAdaptiveFitness", () => {
    it("uses the balanced profile when auto context has no stronger signal", (
        t: TestContext
    ) => {
        t.plan(4);

        const result = computeAdaptiveFitness(
            STRUCTURAL_FITNESS_SCORE,
            runtimeCurrentMetrics,
            runtimeFitnessMetadata,
            "auto"
        );

        t.assert.strictEqual(result.adaptiveFitnessScoreVersion, ADAPTIVE_SCORE_VERSION);
        t.assert.strictEqual(result.adaptiveFitnessScore, EXPECTED_ADAPTIVE_BALANCED_SCORE);
        t.assert.strictEqual(result.adaptiveFitness?.selectedContext, "balanced");
        t.assert.strictEqual(
            result.adaptiveFitness?.activeSignalWeights.structural_quality,
            0.35
        );
    });

    it("computes adaptive output for structural-only collector runs", (
        t: TestContext
    ) => {
        t.plan(4);

        const result = computeAdaptiveFitness(
            STRUCTURAL_FITNESS_SCORE,
            undefined,
            undefined,
            "auto"
        );

        t.assert.strictEqual(result.adaptiveFitnessScore, STRUCTURAL_FITNESS_SCORE);
        t.assert.strictEqual(result.adaptiveFitness?.selectedContext, "balanced");
        t.assert.strictEqual(result.adaptiveFitness?.activeSignalWeights.structural_quality, 1);
        t.assert.ok(result.adaptiveFitness?.missingSignals.includes("latency_p95_ms"));
    });

    it("honors explicit workload, slo, and resource-pressure contexts", (
        t: TestContext
    ) => {
        t.plan(6);

        const workload = computeAdaptiveFitness(
            STRUCTURAL_FITNESS_SCORE,
            runtimeCurrentMetrics,
            runtimeFitnessMetadata,
            "workload"
        );
        const slo = computeAdaptiveFitness(
            STRUCTURAL_FITNESS_SCORE,
            runtimeCurrentMetrics,
            runtimeFitnessMetadata,
            "slo"
        );
        const resourcePressure = computeAdaptiveFitness(
            STRUCTURAL_FITNESS_SCORE,
            runtimeCurrentMetrics,
            runtimeFitnessMetadata,
            "resource-pressure"
        );

        t.assert.strictEqual(workload.adaptiveFitness?.selectedContext, "workload");
        t.assert.strictEqual(workload.adaptiveFitnessScore, EXPECTED_ADAPTIVE_WORKLOAD_SCORE);
        t.assert.strictEqual(slo.adaptiveFitness?.selectedContext, "slo");
        t.assert.strictEqual(slo.adaptiveFitnessScore, EXPECTED_ADAPTIVE_SLO_SCORE);
        t.assert.strictEqual(resourcePressure.adaptiveFitness?.selectedContext, "resource-pressure");
        t.assert.strictEqual(
            resourcePressure.adaptiveFitnessScore,
            EXPECTED_ADAPTIVE_RESOURCE_PRESSURE_SCORE
        );
    });

    it("selects slo context when auto sees an invalid hard constraint", (
        t: TestContext
    ) => {
        t.plan(1);

        const runtimeFitness = computeRuntimeFitness(
            runtimeCurrentMetrics,
            runtimeBaselineMetrics,
            {
                thresholdVersion: THRESHOLD_VERSION,
                constraints: [],
                hasInvalidHardConstraint: true,
                hasUnknownHardConstraint: false,
                eligibleForStableComparison: false,
            }
        ).runtimeFitness;

        const result = computeAdaptiveFitness(
            STRUCTURAL_FITNESS_SCORE,
            runtimeCurrentMetrics,
            runtimeFitness,
            "auto"
        );

        t.assert.strictEqual(result.adaptiveFitness?.selectedContext, "slo");
    });

    it("selects resource-pressure context for warning utilization constraints", (
        t: TestContext
    ) => {
        t.plan(1);

        const runtimeFitness = computeRuntimeFitness(
            runtimeCurrentMetrics,
            runtimeBaselineMetrics,
            {
                thresholdVersion: THRESHOLD_VERSION,
                constraints: [
                    {
                        id: "cpu-pressure-local",
                        metric: "cpu_utilization",
                        classification: "warning",
                        severity: "warning",
                        missing: false,
                    },
                ],
                hasInvalidHardConstraint: false,
                hasUnknownHardConstraint: false,
                eligibleForStableComparison: true,
            }
        ).runtimeFitness;

        const result = computeAdaptiveFitness(
            STRUCTURAL_FITNESS_SCORE,
            runtimeCurrentMetrics,
            runtimeFitness,
            "auto"
        );

        t.assert.strictEqual(result.adaptiveFitness?.selectedContext, "resource-pressure");
    });

    it("selects workload context for non-baseline workloads", (t: TestContext) => {
        t.plan(1);

        const current = parseRuntimeMetrics(runtimeJson({
            ...RUNTIME_CURRENT_PAYLOAD,
            workload: "spike",
        }));
        const result = computeAdaptiveFitness(
            STRUCTURAL_FITNESS_SCORE,
            current,
            runtimeFitnessMetadata,
            "auto"
        );

        t.assert.strictEqual(result.adaptiveFitness?.selectedContext, "workload");
    });

    it("penalizes measured SLO pressure even when baseline has the same violation", (
        t: TestContext
    ) => {
        t.plan(3);

        const current = parseRuntimeMetrics(runtimeJson(INVALID_LATENCY_CURRENT_PAYLOAD));
        const baseline = parseRuntimeMetrics(runtimeJson(INVALID_LATENCY_BASELINE_PAYLOAD));
        const runtimeFitness = computeRuntimeFitness(
            current,
            baseline,
            {
                thresholdVersion: THRESHOLD_VERSION,
                constraints: [
                    {
                        id: "latency-p95-local",
                        metric: "latency_p95_ms",
                        classification: "invalid",
                        severity: "invalid",
                        missing: false,
                    },
                ],
                hasInvalidHardConstraint: true,
                hasUnknownHardConstraint: false,
                eligibleForStableComparison: false,
            }
        ).runtimeFitness;

        const result = computeAdaptiveFitness(null, current, runtimeFitness, "auto");

        t.assert.strictEqual(result.adaptiveFitness?.selectedContext, "slo");
        t.assert.strictEqual(result.adaptiveFitness?.signalValues.latency_p95_ms?.value, -1);
        t.assert.strictEqual(result.adaptiveFitnessScore, -1);
    });

    it("can score resource-pressure evidence without a runtime baseline", (
        t: TestContext
    ) => {
        t.plan(3);

        const current = parseRuntimeMetrics(runtimeJson(RESOURCE_PRESSURE_CURRENT_PAYLOAD));
        const runtimeFitness = computeRuntimeFitness(
            current,
            undefined,
            {
                thresholdVersion: THRESHOLD_VERSION,
                constraints: [
                    {
                        id: "cpu-pressure-local",
                        metric: "cpu_utilization",
                        classification: "warning",
                        severity: "warning",
                        missing: false,
                    },
                ],
                hasInvalidHardConstraint: false,
                hasUnknownHardConstraint: false,
                eligibleForStableComparison: true,
            }
        ).runtimeFitness;

        const result = computeAdaptiveFitness(null, current, runtimeFitness, "auto");

        t.assert.strictEqual(result.adaptiveFitness?.selectedContext, "resource-pressure");
        t.assert.strictEqual(result.adaptiveFitness?.signalValues.cpu_utilization?.value, -0.5);
        t.assert.strictEqual(result.adaptiveFitnessScore, -0.5);
    });

    it("prefers invalid pressure floors over warning floors for the same metric", (
        t: TestContext
    ) => {
        t.plan(2);

        const current = parseRuntimeMetrics(runtimeJson(INVALID_LATENCY_CURRENT_PAYLOAD));
        const runtimeFitness = computeRuntimeFitness(
            current,
            undefined,
            {
                thresholdVersion: THRESHOLD_VERSION,
                constraints: [
                    {
                        id: "latency-p95-warning",
                        metric: "latency_p95_ms",
                        classification: "warning",
                        severity: "warning",
                        missing: false,
                    },
                    {
                        id: "latency-p95-invalid",
                        metric: "latency_p95_ms",
                        classification: "invalid",
                        severity: "invalid",
                        missing: false,
                    },
                ],
                hasInvalidHardConstraint: true,
                hasUnknownHardConstraint: false,
                eligibleForStableComparison: false,
            }
        ).runtimeFitness;

        const result = computeAdaptiveFitness(null, current, runtimeFitness, "auto");

        t.assert.strictEqual(result.adaptiveFitness?.signalValues.latency_p95_ms?.value, -1);
        t.assert.strictEqual(result.adaptiveFitnessScore, -1);
    });

    it("renormalizes active weights when structural score is missing", (
        t: TestContext
    ) => {
        t.plan(3);

        const result = computeAdaptiveFitness(
            null,
            runtimeCurrentMetrics,
            runtimeFitnessMetadata,
            "balanced"
        );

        t.assert.strictEqual(result.adaptiveFitness?.selectedContext, "balanced");
        t.assert.strictEqual(result.adaptiveFitness?.activeSignalWeights.structural_quality, undefined);
        t.assert.ok(result.adaptiveFitness?.missingSignals.includes("structural_quality"));
    });

    it("returns null when no structural or runtime signals are available", (
        t: TestContext
    ) => {
        t.plan(2);

        const result = computeAdaptiveFitness(null, undefined, undefined, "auto");

        t.assert.strictEqual(result.adaptiveFitnessScore, null);
        t.assert.strictEqual(
            result.adaptiveFitness?.reason,
            "no structural or runtime signals are available"
        );
    });
});

describe("parseAdaptiveFitnessContext", () => {
    it("defaults to auto and rejects unsupported contexts", (t: TestContext) => {
        t.plan(3);

        t.assert.strictEqual(parseAdaptiveFitnessContext(undefined), "auto");
        t.assert.strictEqual(parseAdaptiveFitnessContext("slo"), "slo");
        t.assert.throws(
            () => parseAdaptiveFitnessContext("latency"),
            /ADAPTIVE_FITNESS_CONTEXT/
        );
    });
});

describe("computeParetoOptimization", () => {
    it("ranks non-dominated runtime scenario trade-offs ahead of dominated variants", (
        t: TestContext
    ) => {
        t.plan(8);

        const result = computeParetoOptimization([
            runtimeBaselineMetrics,
            runtimeCurrentMetrics,
            parseRuntimeMetrics(runtimeJson(RESOURCE_EFFICIENT_PAYLOAD)),
        ]);

        t.assert.strictEqual(result.paretoOptimizationVersion, PARETO_OPTIMIZATION_VERSION);
        t.assert.strictEqual(
            result.paretoOptimization?.fronts[0].length,
            EXPECTED_PARETO_FIRST_FRONT_SIZE
        );
        t.assert.deepStrictEqual(result.paretoOptimization?.selectedCandidateIds, [
            `${SCENARIO_FIXED_SMALL}:${WORKLOAD_BASELINE}:${SOURCE_LOCAL_KIND}`,
            `${SCENARIO_REPLICAS_2}:${WORKLOAD_BASELINE}:${SOURCE_LOCAL_KIND}`,
        ]);
        t.assert.strictEqual(
            result.paretoOptimization?.candidates.find((candidate) =>
                candidate.scenario === SCENARIO_FIXED_MEDIUM
            )?.rank,
            2
        );
        t.assert.deepStrictEqual(
            result.paretoOptimization?.candidates.find((candidate) =>
                candidate.scenario === SCENARIO_REPLICAS_2
            )?.dominates,
            [`${SCENARIO_FIXED_MEDIUM}:${WORKLOAD_BASELINE}:${SOURCE_LOCAL_KIND}`]
        );
        t.assert.ok(result.paretoOptimization?.activeObjectives.includes("latency_p95_ms"));
        t.assert.ok(result.paretoOptimization?.activeObjectives.includes("memory_utilization"));
        t.assert.strictEqual(result.paretoOptimization?.reason, undefined);
    });

    it("records why Pareto ranking is unavailable for a single candidate", (
        t: TestContext
    ) => {
        t.plan(3);

        const result = computeParetoOptimization([runtimeCurrentMetrics]);

        t.assert.strictEqual(result.paretoOptimization?.fronts.length, 0);
        t.assert.strictEqual(result.paretoOptimization?.selectedCandidateIds.length, 0);
        t.assert.strictEqual(
            result.paretoOptimization?.reason,
            "at least two runtime scenario summaries are required"
        );
    });

    it("does not rank duplicate candidate identities", (t: TestContext) => {
        t.plan(3);

        const result = computeParetoOptimization([
            runtimeCurrentMetrics,
            runtimeCurrentMetrics,
        ]);

        t.assert.deepStrictEqual(result.paretoOptimization?.fronts, []);
        t.assert.strictEqual(result.paretoOptimization?.selectedCandidateIds.length, 0);
        t.assert.strictEqual(
            result.paretoOptimization?.reason,
            "runtime scenario summaries must have unique scenario/workload/source identities"
        );
    });

    it("does not rank mixed workload or source contexts", (t: TestContext) => {
        t.plan(3);

        const result = computeParetoOptimization([
            runtimeBaselineMetrics,
            parseRuntimeMetrics(runtimeJson(MIXED_WORKLOAD_PAYLOAD)),
        ]);

        t.assert.deepStrictEqual(result.paretoOptimization?.fronts, []);
        t.assert.strictEqual(result.paretoOptimization?.selectedCandidateIds.length, 0);
        t.assert.strictEqual(
            result.paretoOptimization?.reason,
            "runtime scenario summaries must share the same workload and source"
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
        t.plan(6);

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
                adaptiveFitnessScore: EXPECTED_ADAPTIVE_BALANCED_SCORE,
                adaptiveFitnessScoreVersion: ADAPTIVE_SCORE_VERSION,
                paretoOptimizationVersion: PARETO_OPTIMIZATION_VERSION,
            });

            const written = JSON.parse(fs.readFileSync(file, "utf-8"));
            t.assert.strictEqual(written.fitnessScore, EXPECTED_WRITTEN_STRUCTURAL_SCORE);
            t.assert.strictEqual(written.runtimeFitnessScore, EXPECTED_WRITTEN_RUNTIME_SCORE);
            t.assert.strictEqual(written.runtimeFitnessScoreVersion, RUNTIME_SCORE_VERSION);
            t.assert.strictEqual(written.adaptiveFitnessScore, EXPECTED_ADAPTIVE_BALANCED_SCORE);
            t.assert.strictEqual(written.adaptiveFitnessScoreVersion, ADAPTIVE_SCORE_VERSION);
            t.assert.strictEqual(written.paretoOptimizationVersion, PARETO_OPTIMIZATION_VERSION);
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
                adaptiveFitnessScore: null,
                adaptiveFitnessScoreVersion: ADAPTIVE_SCORE_VERSION,
                paretoOptimizationVersion: PARETO_OPTIMIZATION_VERSION,
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
                paretoRuntimeMetricsJsonPaths: [],
                runtimeOnly: true,
                adaptiveFitnessContext: "auto",
                sloThresholdsJsonPath: "",
            }),
            /RUNTIME_ONLY=true requires RUNTIME_METRICS_JSON/
        );
    });
});
