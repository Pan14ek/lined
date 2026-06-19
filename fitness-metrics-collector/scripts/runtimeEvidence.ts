import fs from "node:fs";

export type RuntimeMetricSummary = {
    latency_p95_ms?: number;
    latency_p99_ms?: number;
    error_rate?: number;
    throughput_rps?: number;
    availability?: number;
    restart_count?: number;
    cpu_utilization?: number;
    memory_utilization?: number;
    hpa_desired_replicas?: number;
    hpa_current_replicas?: number;
};

export type RuntimeMetrics = {
    schema_version: 1;
    scenario: string;
    workload: string;
    source: string;
    summary: RuntimeMetricSummary;
    missing?: string[];
};

export const SCORABLE_RUNTIME_METRICS = [
    "latency_p95_ms",
    "latency_p99_ms",
    "error_rate",
    "throughput_rps",
    "availability",
    "restart_count",
    "cpu_utilization",
    "memory_utilization",
] as const;

export type RuntimeScoreMetricField = typeof SCORABLE_RUNTIME_METRICS[number];

type RuntimeMetricDefinition = {
    field: keyof RuntimeMetricSummary;
    min: number;
    max?: number;
};

const RUNTIME_METRIC_DEFINITIONS: readonly RuntimeMetricDefinition[] = [
    {field: "latency_p95_ms", min: 0},
    {field: "latency_p99_ms", min: 0},
    {field: "error_rate", min: 0, max: 1},
    {field: "throughput_rps", min: 0},
    {field: "availability", min: 0, max: 1},
    {field: "restart_count", min: 0},
    {field: "cpu_utilization", min: 0},
    {field: "memory_utilization", min: 0},
    {field: "hpa_desired_replicas", min: 0},
    {field: "hpa_current_replicas", min: 0},
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const requireString = (value: unknown, field: string, label: string): string => {
    if (typeof value !== "string" || value.trim() === "") {
        throw new Error(`${label}: ${field} must be a non-empty string`);
    }

    return value;
};

const optionalNumber = (
    value: unknown,
    field: string,
    min: number,
    max?: number
): number | undefined => {
    if (value === undefined) {
        return undefined;
    }

    if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new Error(`Runtime metrics: ${field} must be a finite number`);
    }

    if (value < min) {
        throw new Error(`Runtime metrics: ${field} must be >= ${min}`);
    }

    if (max !== undefined && value > max) {
        throw new Error(`Runtime metrics: ${field} must be <= ${max}`);
    }

    return value;
};

const parseRuntimeMetricSummary = (rawSummary: unknown): RuntimeMetricSummary => {
    if (!isRecord(rawSummary)) {
        throw new Error("Runtime metrics: summary must be an object");
    }

    const summary: RuntimeMetricSummary = {};
    for (const definition of RUNTIME_METRIC_DEFINITIONS) {
        const field = definition.field;
        const value = optionalNumber(
            rawSummary[field],
            `summary.${field}`,
            definition.min,
            definition.max
        );
        if (value !== undefined) {
            summary[field] = value;
        }
    }

    return summary;
};

const parseMissingRuntimeFields = (value: unknown): string[] | undefined => {
    if (value === undefined) {
        return undefined;
    }

    if (!Array.isArray(value)) {
        throw new Error("Runtime metrics: missing must be an array of strings");
    }

    return value.map((item, index) => requireString(item, `missing[${index}]`, "Runtime metrics"));
};

export const parseRuntimeMetrics = (content: string): RuntimeMetrics => {
    const parsed: unknown = JSON.parse(content);
    if (!isRecord(parsed)) {
        throw new Error("Runtime metrics JSON must contain an object");
    }

    if (parsed.schema_version !== 1) {
        throw new Error("Runtime metrics: schema_version must be 1");
    }

    return {
        schema_version: 1,
        scenario: requireString(parsed.scenario, "scenario", "Runtime metrics"),
        workload: requireString(parsed.workload, "workload", "Runtime metrics"),
        source: requireString(parsed.source, "source", "Runtime metrics"),
        summary: parseRuntimeMetricSummary(parsed.summary),
        missing: parseMissingRuntimeFields(parsed.missing),
    };
};

export const readRuntimeMetrics = (path?: string): RuntimeMetrics | undefined => {
    if (!path || path.trim() === "") {
        return undefined;
    }

    return parseRuntimeMetrics(fs.readFileSync(path, "utf-8"));
};

export const readRuntimeMetricSet = (paths: readonly string[]): RuntimeMetrics[] =>
    paths.map((path) => parseRuntimeMetrics(fs.readFileSync(path, "utf-8")));

type ThresholdRule = {
    id: string;
    metric?: string;
    evidence_source?: string;
    operator: "<=" | ">=" | "==" | ">";
    value: number | boolean;
    severity: "invalid" | "warning";
};

export type SloThresholdDocument = {
    threshold_version: string;
    thresholds: ThresholdRule[];
};

export type RuntimeSloClassification = "valid" | "warning" | "invalid" | "unknown";

export type RuntimeSloConstraintResult = {
    id: string;
    metric?: string;
    evidenceSource?: string;
    classification: RuntimeSloClassification;
    severity: "invalid" | "warning";
    missing: boolean;
};

export type RuntimeSloResult = {
    thresholdVersion: string;
    constraints: RuntimeSloConstraintResult[];
    hasInvalidHardConstraint: boolean;
    hasUnknownHardConstraint: boolean;
    eligibleForStableComparison: boolean;
};

export type RuntimeEvidenceClassification = {
    current: RuntimeMetrics;
    baseline?: RuntimeMetrics;
    currentSummary: RuntimeMetricSummary;
    baselineSummary?: RuntimeMetricSummary;
    missingMetrics: string[];
    sloClassification?: RuntimeSloResult;
    thresholdVersion?: string;
    constraints?: RuntimeSloConstraintResult[];
    hasInvalidHardConstraint: boolean;
    hasUnknownHardConstraint: boolean;
    eligibleForStableComparison: boolean;
    reason?: string;
};

type ThresholdInput = SloThresholdDocument | RuntimeSloResult | undefined;

const SUPPORTED_THRESHOLD_OPERATORS = ["<=", ">=", "==", ">"] as const;
const SUPPORTED_THRESHOLD_SEVERITIES = ["invalid", "warning"] as const;

const optionalString = (value: unknown, field: string): string | undefined =>
    value === undefined ? undefined : requireString(value, field, "SLO thresholds");

const requireNumberOrBoolean = (value: unknown, field: string): number | boolean => {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === "boolean") {
        return value;
    }

    throw new Error(`SLO thresholds: ${field} must be a finite number or boolean`);
};

const requireThresholdOperator = (value: unknown, field: string): ThresholdRule["operator"] => {
    const operator = requireString(value, field, "SLO thresholds");
    if (!SUPPORTED_THRESHOLD_OPERATORS.includes(operator as ThresholdRule["operator"])) {
        throw new Error(`SLO thresholds: ${field} is unsupported`);
    }

    return operator as ThresholdRule["operator"];
};

const requireThresholdSeverity = (value: unknown, field: string): ThresholdRule["severity"] => {
    const severity = requireString(value, field, "SLO thresholds");
    if (!SUPPORTED_THRESHOLD_SEVERITIES.includes(severity as ThresholdRule["severity"])) {
        throw new Error(`SLO thresholds: ${field} is unsupported`);
    }

    return severity as ThresholdRule["severity"];
};

const parseThresholdRule = (value: unknown, index: number): ThresholdRule => {
    if (!isRecord(value)) {
        throw new Error(`SLO thresholds: thresholds[${index}] must be an object`);
    }

    return {
        id: requireString(value.id, `thresholds[${index}].id`, "SLO thresholds"),
        metric: optionalString(value.metric, `thresholds[${index}].metric`),
        evidence_source: optionalString(
            value.evidence_source,
            `thresholds[${index}].evidence_source`
        ),
        operator: requireThresholdOperator(value.operator, `thresholds[${index}].operator`),
        value: requireNumberOrBoolean(value.value, `thresholds[${index}].value`),
        severity: requireThresholdSeverity(value.severity, `thresholds[${index}].severity`),
    };
};

export const parseSloThresholds = (content: string): SloThresholdDocument => {
    const parsed: unknown = JSON.parse(content);
    if (!isRecord(parsed)) {
        throw new Error("SLO thresholds JSON must contain an object");
    }

    if (!Array.isArray(parsed.thresholds)) {
        throw new Error("SLO thresholds: thresholds must be an array");
    }

    return {
        threshold_version: requireString(parsed.threshold_version, "threshold_version", "SLO thresholds"),
        thresholds: parsed.thresholds.map(parseThresholdRule),
    };
};

const compareThreshold = (
    current: number | boolean,
    operator: ThresholdRule["operator"],
    expected: number | boolean
): boolean => {
    if (typeof current === "boolean" || typeof expected === "boolean") {
        return operator === "==" && current === expected;
    }

    if (operator === "<=") return current <= expected;
    if (operator === ">=") return current >= expected;
    if (operator === ">") return current > expected;
    return current === expected;
};

const classifyThresholdMatch = (
    threshold: ThresholdRule,
    missing: boolean,
    matched: boolean
): RuntimeSloClassification => {
    if (missing) {
        return "unknown";
    }

    if (threshold.severity === "warning") {
        return matched ? "warning" : "valid";
    }

    return matched ? "valid" : "invalid";
};

const classifyThreshold = (
    runtimeMetrics: RuntimeMetrics,
    threshold: ThresholdRule
): RuntimeSloConstraintResult => {
    const field = threshold.metric as keyof RuntimeMetricSummary | undefined;
    const current = field === undefined ? undefined : runtimeMetrics.summary[field];
    const missing = current === undefined;
    const matched = !missing && compareThreshold(current, threshold.operator, threshold.value);

    return {
        id: threshold.id,
        metric: threshold.metric,
        evidenceSource: threshold.evidence_source,
        classification: classifyThresholdMatch(threshold, missing, matched),
        severity: threshold.severity,
        missing,
    };
};

const hasHardConstraint = (
    constraints: RuntimeSloConstraintResult[],
    classification: RuntimeSloClassification
): boolean => constraints.some((constraint) =>
    constraint.severity === "invalid" && constraint.classification === classification
);

export const classifyRuntimeMetrics = (
    runtimeMetrics: RuntimeMetrics,
    thresholds: SloThresholdDocument
): RuntimeSloResult => {
    const constraints = thresholds.thresholds.map((threshold) =>
        classifyThreshold(runtimeMetrics, threshold)
    );
    const hasInvalidHardConstraint = hasHardConstraint(constraints, "invalid");
    const hasUnknownHardConstraint = hasHardConstraint(constraints, "unknown");

    return {
        thresholdVersion: thresholds.threshold_version,
        constraints,
        hasInvalidHardConstraint,
        hasUnknownHardConstraint,
        eligibleForStableComparison: !hasInvalidHardConstraint && !hasUnknownHardConstraint,
    };
};

const isRuntimeSloResult = (value: ThresholdInput): value is RuntimeSloResult =>
    value !== undefined &&
    "thresholdVersion" in value &&
    Array.isArray(value.constraints);

const resolveSloClassification = (
    current: RuntimeMetrics,
    thresholdInput: ThresholdInput
): RuntimeSloResult | undefined => {
    if (!thresholdInput) {
        return undefined;
    }

    return isRuntimeSloResult(thresholdInput)
        ? thresholdInput
        : classifyRuntimeMetrics(current, thresholdInput);
};

const collectMissingRuntimeScoreMetrics = (
    current: RuntimeMetrics,
    baseline?: RuntimeMetrics
): string[] => {
    const missing = new Set<string>(current.missing ?? []);

    for (const field of SCORABLE_RUNTIME_METRICS) {
        if (current.summary[field] === undefined) {
            missing.add(`current.summary.${field}`);
        }
        if (baseline && baseline.summary[field] === undefined) {
            missing.add(`baseline.summary.${field}`);
        }
    }

    return [...missing].sort();
};

const buildRuntimeEvidenceReason = (
    baseline: RuntimeMetrics | undefined,
    sloClassification: RuntimeSloResult | undefined
): string | undefined => {
    if (!baseline) {
        return "runtime baseline metrics are not available";
    }

    if (sloClassification?.eligibleForStableComparison === false) {
        if (sloClassification.hasInvalidHardConstraint && !sloClassification.hasUnknownHardConstraint) {
            return "runtime evidence violates hard stable-comparison constraints";
        }
        if (sloClassification.hasUnknownHardConstraint && !sloClassification.hasInvalidHardConstraint) {
            return "runtime evidence is missing hard-constraint evidence for stable comparison";
        }
        return "runtime evidence does not satisfy stable-comparison constraints";
    }

    return undefined;
};

export const classifyRuntimeEvidenceForScoring = (
    current: RuntimeMetrics,
    baseline?: RuntimeMetrics,
    thresholdInput?: ThresholdInput
): RuntimeEvidenceClassification => {
    const sloClassification = resolveSloClassification(current, thresholdInput);

    return {
        current,
        baseline,
        currentSummary: current.summary,
        baselineSummary: baseline?.summary,
        missingMetrics: collectMissingRuntimeScoreMetrics(current, baseline),
        sloClassification,
        thresholdVersion: sloClassification?.thresholdVersion,
        constraints: sloClassification?.constraints,
        hasInvalidHardConstraint: sloClassification?.hasInvalidHardConstraint ?? false,
        hasUnknownHardConstraint: sloClassification?.hasUnknownHardConstraint ?? false,
        eligibleForStableComparison: Boolean(
            baseline && (sloClassification?.eligibleForStableComparison ?? true)
        ),
        reason: buildRuntimeEvidenceReason(baseline, sloClassification),
    };
};
