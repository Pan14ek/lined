import type {
    RuntimeFitnessMetadata,
    RuntimeMetrics,
} from "./runtimeScoring";

export const ADAPTIVE_FITNESS_SCORE_VERSION = "adaptive-weighted-v1";

export type AdaptiveFitnessContext =
    | "auto"
    | "balanced"
    | "workload"
    | "slo"
    | "resource-pressure";

type ResolvedAdaptiveFitnessContext = Exclude<AdaptiveFitnessContext, "auto">;

type AdaptiveFitnessScore = number | null;

type AdaptiveSignal =
    | "structural_quality"
    | "latency_p95_ms"
    | "latency_p99_ms"
    | "error_rate"
    | "throughput_rps"
    | "availability"
    | "restart_count"
    | "cpu_utilization"
    | "memory_utilization";

type AdaptiveSignalResult = {
    value: number;
    weight: number;
};

export type AdaptiveFitnessMetadata = {
    requestedContext: AdaptiveFitnessContext;
    selectedContext: ResolvedAdaptiveFitnessContext;
    activeSignalWeights: Partial<Record<AdaptiveSignal, number>>;
    signalValues: Partial<Record<AdaptiveSignal, AdaptiveSignalResult>>;
    missingSignals: string[];
    weightProfile: Record<AdaptiveSignal, number>;
    reason?: string;
};

export type AdaptiveFitnessResult = {
    adaptiveFitnessScore: AdaptiveFitnessScore;
    adaptiveFitnessScoreVersion: typeof ADAPTIVE_FITNESS_SCORE_VERSION;
    adaptiveFitness?: AdaptiveFitnessMetadata;
};

type AdaptiveSignalDefinition = {
    signal: AdaptiveSignal;
    value: number | undefined;
};

const ADAPTIVE_WEIGHT_PROFILES: Record<
    ResolvedAdaptiveFitnessContext,
    Record<AdaptiveSignal, number>
> = {
    // balanced/workload derived from a tier-budget rule over runtime signals (0.80 total, leaving a
    // fixed 0.20 share for structural_quality). balanced uses a flat 2-tier grouping (even emphasis
    // across response quality/correctness/throughput/availability; B=0.70/n=5=0.14 each), so it is not
    // a scalar multiple of Table 2's differentiated fixed profile. workload keeps a differentiated
    // 4-tier grouping (B(4)=0.32,B(3)=0.36,B(2)=0.08,B(1)=0.04) that shifts priority toward response
    // time and throughput. See science_sections/03_materials_and_methods for the full derivation.
    balanced: {
        structural_quality: 0.2,
        latency_p95_ms: 0.14,
        latency_p99_ms: 0.14,
        error_rate: 0.14,
        throughput_rps: 0.14,
        availability: 0.14,
        restart_count: 0.06,
        cpu_utilization: 0.02,
        memory_utilization: 0.02,
    },
    workload: {
        structural_quality: 0.2,
        latency_p95_ms: 0.16,
        latency_p99_ms: 0.18,
        error_rate: 0.18,
        throughput_rps: 0.16,
        availability: 0.04,
        restart_count: 0.04,
        cpu_utilization: 0.02,
        memory_utilization: 0.02,
    },
    slo: {
        structural_quality: 0.15,
        latency_p95_ms: 0.25,
        latency_p99_ms: 0.2,
        error_rate: 0.2,
        throughput_rps: 0.02,
        availability: 0.12,
        restart_count: 0.05,
        cpu_utilization: 0.005,
        memory_utilization: 0.005,
    },
    "resource-pressure": {
        structural_quality: 0.2,
        latency_p95_ms: 0.1,
        latency_p99_ms: 0.05,
        error_rate: 0.05,
        throughput_rps: 0.15,
        availability: 0.03,
        restart_count: 0.02,
        cpu_utilization: 0.2,
        memory_utilization: 0.2,
    },
};

const isAdaptiveFitnessContext = (value: string): value is AdaptiveFitnessContext => {
    return value === "auto" ||
        value === "balanced" ||
        value === "workload" ||
        value === "slo" ||
        value === "resource-pressure";
};

export const parseAdaptiveFitnessContext = (
    value: string | undefined
): AdaptiveFitnessContext => {
    if (value === undefined || value.trim() === "") {
        return "auto";
    }

    const normalized = value.trim();
    if (!isAdaptiveFitnessContext(normalized)) {
        throw new Error(
            "ADAPTIVE_FITNESS_CONTEXT must be one of auto, balanced, workload, slo, resource-pressure"
        );
    }

    return normalized;
};

const hasResourcePressureWarning = (runtimeFitness: RuntimeFitnessMetadata | undefined): boolean =>
    Boolean(runtimeFitness?.sloClassification?.constraints.some((constraint) =>
        (constraint.metric === "cpu_utilization" || constraint.metric === "memory_utilization") &&
        constraint.classification === "warning"
    ));

const selectAdaptiveContext = (
    requestedContext: AdaptiveFitnessContext,
    currentRuntime: RuntimeMetrics | undefined,
    runtimeFitness: RuntimeFitnessMetadata | undefined
): ResolvedAdaptiveFitnessContext => {
    if (requestedContext !== "auto") {
        return requestedContext;
    }

    if (runtimeFitness?.sloClassification?.hasInvalidHardConstraint) {
        return "slo";
    }

    if (hasResourcePressureWarning(runtimeFitness)) {
        return "resource-pressure";
    }

    if (currentRuntime?.workload !== undefined && currentRuntime.workload !== "baseline") {
        return "workload";
    }

    return "balanced";
};

const runtimeSignalValue = (
    runtimeFitness: RuntimeFitnessMetadata | undefined,
    signal: Exclude<AdaptiveSignal, "structural_quality">
): number | undefined => {
    const normalizedDelta = runtimeFitness?.normalizedDeltas[signal]?.normalizedDelta;
    const pressureFloor = runtimeSignalPressureFloor(runtimeFitness, signal);

    if (normalizedDelta === undefined) {
        return pressureFloor;
    }

    if (pressureFloor === undefined) {
        return normalizedDelta;
    }

    return Math.min(normalizedDelta, pressureFloor);
};

const runtimeSignalPressureFloor = (
    runtimeFitness: RuntimeFitnessMetadata | undefined,
    signal: Exclude<AdaptiveSignal, "structural_quality">
): number | undefined => {
    const constraints = runtimeFitness?.sloClassification?.constraints.filter((candidate) =>
        candidate.metric === signal
    ) ?? [];

    if (constraints.some((constraint) => constraint.classification === "invalid")) {
        return -1;
    }

    if (constraints.some((constraint) => constraint.classification === "warning")) {
        return -0.5;
    }

    return undefined;
};

const collectAdaptiveSignalDefinitions = (
    structuralFitnessScore: number | null,
    runtimeFitness: RuntimeFitnessMetadata | undefined
): readonly AdaptiveSignalDefinition[] => [
    {signal: "structural_quality", value: structuralFitnessScore ?? undefined},
    {signal: "latency_p95_ms", value: runtimeSignalValue(runtimeFitness, "latency_p95_ms")},
    {signal: "latency_p99_ms", value: runtimeSignalValue(runtimeFitness, "latency_p99_ms")},
    {signal: "error_rate", value: runtimeSignalValue(runtimeFitness, "error_rate")},
    {signal: "throughput_rps", value: runtimeSignalValue(runtimeFitness, "throughput_rps")},
    {signal: "availability", value: runtimeSignalValue(runtimeFitness, "availability")},
    {signal: "restart_count", value: runtimeSignalValue(runtimeFitness, "restart_count")},
    {signal: "cpu_utilization", value: runtimeSignalValue(runtimeFitness, "cpu_utilization")},
    {signal: "memory_utilization", value: runtimeSignalValue(runtimeFitness, "memory_utilization")},
];

const roundWeight = (weight: number): number => Number(weight.toFixed(6));

export const computeAdaptiveFitness = (
    structuralFitnessScore: number | null,
    currentRuntime: RuntimeMetrics | undefined,
    runtimeFitness: RuntimeFitnessMetadata | undefined,
    requestedContext: AdaptiveFitnessContext
): AdaptiveFitnessResult => {
    const selectedContext = selectAdaptiveContext(
        requestedContext,
        currentRuntime,
        runtimeFitness
    );
    const weightProfile = ADAPTIVE_WEIGHT_PROFILES[selectedContext];
    const signalDefinitions = collectAdaptiveSignalDefinitions(
        structuralFitnessScore,
        runtimeFitness
    );
    const activeDefinitions = signalDefinitions.filter((definition) =>
        definition.value !== undefined
    );
    const missingSignals = signalDefinitions
        .filter((definition) => definition.value === undefined)
        .map((definition) => definition.signal);

    if (activeDefinitions.length === 0) {
        return {
            adaptiveFitnessScore: null,
            adaptiveFitnessScoreVersion: ADAPTIVE_FITNESS_SCORE_VERSION,
            adaptiveFitness: {
                requestedContext,
                selectedContext,
                activeSignalWeights: {},
                signalValues: {},
                missingSignals,
                weightProfile,
                reason: "no structural or runtime signals are available",
            },
        };
    }

    const totalWeight = activeDefinitions.reduce(
        (sum, definition) => sum + weightProfile[definition.signal],
        0
    );
    const activeSignalWeights: Partial<Record<AdaptiveSignal, number>> = {};
    const signalValues: Partial<Record<AdaptiveSignal, AdaptiveSignalResult>> = {};
    let score = 0;

    for (const definition of activeDefinitions) {
        const activeWeight = weightProfile[definition.signal] / totalWeight;
        const rounded = roundWeight(activeWeight);
        const value = definition.value as number;

        activeSignalWeights[definition.signal] = rounded;
        signalValues[definition.signal] = {
            value,
            weight: rounded,
        };
        score += activeWeight * value;
    }

    return {
        adaptiveFitnessScore: Number(score.toFixed(4)),
        adaptiveFitnessScoreVersion: ADAPTIVE_FITNESS_SCORE_VERSION,
        adaptiveFitness: {
            requestedContext,
            selectedContext,
            activeSignalWeights,
            signalValues,
            missingSignals,
            weightProfile,
        },
    };
};
