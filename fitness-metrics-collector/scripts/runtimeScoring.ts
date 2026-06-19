import {
    SCORABLE_RUNTIME_METRICS,
    classifyRuntimeEvidenceForScoring,
    classifyRuntimeMetrics,
    parseSloThresholds,
    type RuntimeEvidenceClassification,
    type RuntimeMetrics,
    type RuntimeMetricSummary,
    type RuntimeScoreMetricField,
    type RuntimeSloResult,
    type SloThresholdDocument,
} from "./runtimeEvidence";

export const RUNTIME_FITNESS_SCORE_VERSION = "runtime-aware-v1";

type RuntimeFitnessScore = number | null;

type RuntimeFitnessMetric = RuntimeScoreMetricField;

type RuntimeScoreMetricResult = {
    baseline: number;
    current: number;
    normalizedDelta: number;
    weight: number;
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

type RuntimeScoreDefinition = {
    field: RuntimeFitnessMetric;
    weight: number;
    higherIsBetter: boolean;
};

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

const identityOf = (runtimeMetrics: RuntimeMetrics): RuntimeFitnessMetadata["current"] => ({
    scenario: runtimeMetrics.scenario,
    workload: runtimeMetrics.workload,
    source: runtimeMetrics.source,
});

const buildRuntimeFitnessMetadata = (
    classification: RuntimeEvidenceClassification
): RuntimeFitnessMetadata => {
    return {
        current: identityOf(classification.current),
        baseline: classification.baseline ? identityOf(classification.baseline) : undefined,
        activeMetricWeights: {},
        missingMetrics: classification.missingMetrics,
        normalizedDeltas: {},
        sloClassification: classification.sloClassification,
        eligibleForStableComparison: classification.eligibleForStableComparison,
        reason: classification.reason,
    };
};

const comparableRuntimeScoreDefinitions = (
    current: RuntimeMetrics,
    baseline: RuntimeMetrics
): readonly RuntimeScoreDefinition[] => RUNTIME_SCORE_DEFINITIONS.filter((definition) =>
    SCORABLE_RUNTIME_METRICS.includes(definition.field) &&
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
    thresholdInput?: RuntimeSloResult | SloThresholdDocument
): RuntimeFitnessResult => {
    if (!current) {
        return {
            runtimeFitnessScore: null,
            runtimeFitnessScoreVersion: RUNTIME_FITNESS_SCORE_VERSION,
        };
    }

    const evidenceClassification = classifyRuntimeEvidenceForScoring(
        current,
        baseline,
        thresholdInput
    );
    const metadataBase = buildRuntimeFitnessMetadata(evidenceClassification);

    if (!baseline) {
        return {
            runtimeFitnessScore: null,
            runtimeFitnessScoreVersion: RUNTIME_FITNESS_SCORE_VERSION,
            runtimeFitness: metadataBase,
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

export {
    classifyRuntimeEvidenceForScoring,
    classifyRuntimeMetrics,
    parseSloThresholds,
};

export type {
    RuntimeEvidenceClassification,
    RuntimeMetrics,
    RuntimeMetricSummary,
    RuntimeSloResult,
    SloThresholdDocument,
};
