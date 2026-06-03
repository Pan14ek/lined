export const RUNTIME_FITNESS_SCORE_VERSION = "runtime-aware-v1";

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

type RuntimeFitnessScore = number | null;

type RuntimeFitnessMetric = keyof Pick<
    RuntimeMetricSummary,
    | "latency_p95_ms"
    | "latency_p99_ms"
    | "error_rate"
    | "throughput_rps"
    | "availability"
    | "restart_count"
    | "cpu_utilization"
    | "memory_utilization"
>;

type RuntimeScoreMetricResult = {
    baseline: number;
    current: number;
    normalizedDelta: number;
    weight: number;
};

type RuntimeSloClassification = "valid" | "warning" | "invalid" | "unknown";

type RuntimeSloConstraintResult = {
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

export type RuntimeFitnessMetadata = {
    current: {
        scenario: string;
        workload: string;
        source: string;
    };
    baseline?: {
        scenario: string;
        workload: string;
        source: string;
    };
    activeMetricWeights: Partial<Record<RuntimeFitnessMetric, number>>;
    missingMetrics: string[];
    normalizedDeltas: Partial<Record<RuntimeFitnessMetric, RuntimeScoreMetricResult>>;
    sloClassification?: RuntimeSloResult;
    eligibleForStableComparison: boolean;
    reason?: string;
};

export type RuntimeFitnessResult = {
    runtimeFitnessScore: RuntimeFitnessScore;
    runtimeFitnessScoreVersion: typeof RUNTIME_FITNESS_SCORE_VERSION;
    runtimeFitness?: RuntimeFitnessMetadata;
};

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

type RuntimeScoreDefinition = {
    field: RuntimeFitnessMetric;
    weight: number;
    higherIsBetter: boolean;
};

const SUPPORTED_THRESHOLD_OPERATORS = ["<=", ">=", "==", ">"] as const;
const SUPPORTED_THRESHOLD_SEVERITIES = ["invalid", "warning"] as const;

const RUNTIME_SCORE_DEFINITIONS: readonly RuntimeScoreDefinition[] = [
    {field: "latency_p95_ms", weight: 0.2, higherIsBetter: false},
    {field: "latency_p99_ms", weight: 0.15, higherIsBetter: false},
    {field: "error_rate", weight: 0.2, higherIsBetter: false},
    {field: "throughput_rps", weight: 0.15, higherIsBetter: true},
    {field: "availability", weight: 0.15, higherIsBetter: true},
    {field: "restart_count", weight: 0.1, higherIsBetter: false},
    {field: "cpu_utilization", weight: 0.025, higherIsBetter: false},
    {field: "memory_utilization", weight: 0.025, higherIsBetter: false},
];

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === "object" && value !== null && !Array.isArray(value);
};

const requireString = (value: unknown, field: string): string => {
    if (typeof value !== "string" || value.trim() === "") {
        throw new Error(`SLO thresholds: ${field} must be a non-empty string`);
    }

    return value;
};

const optionalString = (value: unknown, field: string): string | undefined => {
    return value === undefined ? undefined : requireString(value, field);
};

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
    const operator = requireString(value, field);
    if (!SUPPORTED_THRESHOLD_OPERATORS.includes(operator as ThresholdRule["operator"])) {
        throw new Error(`SLO thresholds: ${field} is unsupported`);
    }

    return operator as ThresholdRule["operator"];
};

const requireThresholdSeverity = (value: unknown, field: string): ThresholdRule["severity"] => {
    const severity = requireString(value, field);
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
        id: requireString(value.id, `thresholds[${index}].id`),
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
        threshold_version: requireString(parsed.threshold_version, "threshold_version"),
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
    const matched = !missing && compareThreshold(
        current,
        threshold.operator,
        threshold.value
    );

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

const identityOf = (runtimeMetrics: RuntimeMetrics): RuntimeFitnessMetadata["current"] => ({
    scenario: runtimeMetrics.scenario,
    workload: runtimeMetrics.workload,
    source: runtimeMetrics.source,
});

const collectMissingRuntimeScoreMetrics = (
    current: RuntimeMetrics,
    baseline?: RuntimeMetrics
): string[] => {
    const missing = new Set<string>(current.missing ?? []);

    for (const definition of RUNTIME_SCORE_DEFINITIONS) {
        if (current.summary[definition.field] === undefined) {
            missing.add(`current.summary.${definition.field}`);
        }
        if (baseline && baseline.summary[definition.field] === undefined) {
            missing.add(`baseline.summary.${definition.field}`);
        }
    }

    return [...missing].sort();
};

const buildRuntimeFitnessMetadata = (
    current: RuntimeMetrics,
    baseline: RuntimeMetrics | undefined,
    sloClassification: RuntimeSloResult | undefined
): RuntimeFitnessMetadata => {
    return {
        current: identityOf(current),
        baseline: baseline ? identityOf(baseline) : undefined,
        activeMetricWeights: {},
        missingMetrics: collectMissingRuntimeScoreMetrics(current, baseline),
        normalizedDeltas: {},
        sloClassification,
        eligibleForStableComparison: Boolean(
            baseline && sloClassification?.eligibleForStableComparison
        ),
    };
};

const comparableRuntimeScoreDefinitions = (
    current: RuntimeMetrics,
    baseline: RuntimeMetrics
): readonly RuntimeScoreDefinition[] => RUNTIME_SCORE_DEFINITIONS.filter((definition) =>
    current.summary[definition.field] !== undefined &&
    baseline.summary[definition.field] !== undefined
);

const clamp = (value: number, min: number, max: number): number =>
    Math.max(min, Math.min(max, value));

const normalizeRuntimeDelta = (
    baseline: number,
    current: number,
    higherIsBetter: boolean
): number => {
    if (baseline === 0 && current === 0) return 0;
    if (baseline === 0) {
        if (higherIsBetter) return current > 0 ? 1 : -1;
        return current > 0 ? -1 : 1;
    }
    const delta = higherIsBetter
        ? (current - baseline) / baseline
        : (baseline - current) / baseline;
    return clamp(delta, -1, 1);
};

const addRuntimeScoreMetric = (
    current: RuntimeMetrics,
    baseline: RuntimeMetrics,
    definition: RuntimeScoreDefinition,
    totalWeight: number,
    activeMetricWeights: Partial<Record<RuntimeFitnessMetric, number>>,
    normalizedDeltas: Partial<Record<RuntimeFitnessMetric, RuntimeScoreMetricResult>>
): number => {
    const currentValue = current.summary[definition.field] as number;
    const baselineValue = baseline.summary[definition.field] as number;
    const activeWeight = definition.weight / totalWeight;
    const normalizedDelta = normalizeRuntimeDelta(
        baselineValue,
        currentValue,
        definition.higherIsBetter
    );
    const roundedWeight = Number(activeWeight.toFixed(6));

    activeMetricWeights[definition.field] = roundedWeight;
    normalizedDeltas[definition.field] = {
        baseline: baselineValue,
        current: currentValue,
        normalizedDelta,
        weight: roundedWeight,
    };

    return activeWeight * normalizedDelta;
};

const computeRuntimeScoreDetails = (
    current: RuntimeMetrics,
    baseline: RuntimeMetrics,
    activeDefinitions: readonly RuntimeScoreDefinition[]
): Pick<RuntimeFitnessMetadata, "activeMetricWeights" | "normalizedDeltas"> & {
    score: number;
} => {
    const activeMetricWeights: Partial<Record<RuntimeFitnessMetric, number>> = {};
    const normalizedDeltas: Partial<Record<RuntimeFitnessMetric, RuntimeScoreMetricResult>> = {};
    const totalWeight = activeDefinitions.reduce((sum, definition) => sum + definition.weight, 0);
    let score = 0;

    for (const definition of activeDefinitions) {
        score += addRuntimeScoreMetric(
            current,
            baseline,
            definition,
            totalWeight,
            activeMetricWeights,
            normalizedDeltas
        );
    }

    return {
        score,
        activeMetricWeights,
        normalizedDeltas,
    };
};

export const computeRuntimeFitness = (
    current?: RuntimeMetrics,
    baseline?: RuntimeMetrics,
    sloClassification?: RuntimeSloResult
): RuntimeFitnessResult => {
    if (!current) {
        return {
            runtimeFitnessScore: null,
            runtimeFitnessScoreVersion: RUNTIME_FITNESS_SCORE_VERSION,
        };
    }

    const metadataBase = buildRuntimeFitnessMetadata(current, baseline, sloClassification);

    if (!baseline) {
        return {
            runtimeFitnessScore: null,
            runtimeFitnessScoreVersion: RUNTIME_FITNESS_SCORE_VERSION,
            runtimeFitness: {
                ...metadataBase,
                reason: "runtime baseline metrics are not available",
            },
        };
    }

    const activeDefinitions = comparableRuntimeScoreDefinitions(current, baseline);
    if (activeDefinitions.length === 0) {
        return {
            runtimeFitnessScore: null,
            runtimeFitnessScoreVersion: RUNTIME_FITNESS_SCORE_VERSION,
            runtimeFitness: {
                ...metadataBase,
                reason: "no comparable runtime metrics are available",
            },
        };
    }

    const scoreDetails = computeRuntimeScoreDetails(current, baseline, activeDefinitions);

    return {
        runtimeFitnessScore: Number(scoreDetails.score.toFixed(4)),
        runtimeFitnessScoreVersion: RUNTIME_FITNESS_SCORE_VERSION,
        runtimeFitness: {
            ...metadataBase,
            activeMetricWeights: scoreDetails.activeMetricWeights,
            normalizedDeltas: scoreDetails.normalizedDeltas,
        },
    };
};
