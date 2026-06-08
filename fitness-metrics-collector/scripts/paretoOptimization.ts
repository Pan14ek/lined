import type {
    RuntimeMetrics,
} from "./runtimeScoring";

export const PARETO_OPTIMIZATION_VERSION = "pareto-baseline-v1";

const OBJECTIVES = {
    latency_p95_ms: "minimize",
    latency_p99_ms: "minimize",
    error_rate: "minimize",
    throughput_rps: "maximize",
    availability: "maximize",
    restart_count: "minimize",
    cpu_utilization: "minimize",
    memory_utilization: "minimize",
} as const;

export type ParetoObjective = keyof typeof OBJECTIVES;
export type ParetoObjectiveDirection = (typeof OBJECTIVES)[ParetoObjective];

export type ParetoCandidate = {
    id: string;
    scenario: string;
    workload: string;
    source: string;
    objectives: Partial<Record<ParetoObjective, number>>;
    missingObjectives: ParetoObjective[];
    rank?: number;
    front?: number;
    crowdingDistance?: number | "Infinity";
    dominates: string[];
    dominatedBy: string[];
};

export type ParetoOptimizationMetadata = {
    objectiveVersion: typeof PARETO_OPTIMIZATION_VERSION;
    objectives: Record<ParetoObjective, ParetoObjectiveDirection>;
    activeObjectives: ParetoObjective[];
    omittedObjectives: ParetoObjective[];
    candidates: ParetoCandidate[];
    fronts: string[][];
    selectedCandidateIds: string[];
    reason?: string;
};

export type ParetoOptimizationResult = {
    paretoOptimizationVersion: typeof PARETO_OPTIMIZATION_VERSION;
    paretoOptimization?: ParetoOptimizationMetadata;
};

const OBJECTIVE_NAMES = Object.keys(OBJECTIVES) as ParetoObjective[];

const candidateId = (runtime: RuntimeMetrics): string =>
    `${runtime.scenario}:${runtime.workload}:${runtime.source}`;

const objectiveValue = (
    runtime: RuntimeMetrics,
    objective: ParetoObjective
): number | undefined => runtime.summary[objective];

const comparableObjectives = (runtimes: readonly RuntimeMetrics[]): ParetoObjective[] =>
    OBJECTIVE_NAMES.filter((objective) =>
        runtimes.every((runtime) => objectiveValue(runtime, objective) !== undefined)
    );

const buildCandidate = (
    runtime: RuntimeMetrics,
    activeObjectives: readonly ParetoObjective[]
): ParetoCandidate => ({
    id: candidateId(runtime),
    scenario: runtime.scenario,
    workload: runtime.workload,
    source: runtime.source,
    objectives: Object.fromEntries(
        activeObjectives.map((objective) => [objective, objectiveValue(runtime, objective)])
    ) as Partial<Record<ParetoObjective, number>>,
    missingObjectives: OBJECTIVE_NAMES.filter((objective) =>
        objectiveValue(runtime, objective) === undefined
    ),
    dominates: [],
    dominatedBy: [],
});

const uniqueCount = (values: readonly string[]): number => new Set(values).size;

const unavailableResult = (
    activeObjectives: ParetoObjective[],
    candidates: ParetoCandidate[],
    reason: string
): ParetoOptimizationResult => ({
    paretoOptimizationVersion: PARETO_OPTIMIZATION_VERSION,
    paretoOptimization: {
        objectiveVersion: PARETO_OPTIMIZATION_VERSION,
        objectives: OBJECTIVES,
        activeObjectives,
        omittedObjectives: OBJECTIVE_NAMES.filter((objective) =>
            !activeObjectives.includes(objective)
        ),
        candidates,
        fronts: [],
        selectedCandidateIds: [],
        reason,
    },
});

const validateCandidateSet = (
    runtimes: readonly RuntimeMetrics[],
    candidates: readonly ParetoCandidate[],
    activeObjectives: readonly ParetoObjective[]
): string | undefined => {
    if (runtimes.length < 2) {
        return "at least two runtime scenario summaries are required";
    }

    if (uniqueCount(candidates.map((candidate) => candidate.id)) !== candidates.length) {
        return "runtime scenario summaries must have unique scenario/workload/source identities";
    }

    if (
        uniqueCount(runtimes.map((runtime) => runtime.workload)) > 1 ||
        uniqueCount(runtimes.map((runtime) => runtime.source)) > 1
    ) {
        return "runtime scenario summaries must share the same workload and source";
    }

    if (activeObjectives.length === 0) {
        return "no objective is present for every candidate";
    }

    return undefined;
};

const isBetter = (
    left: number,
    right: number,
    direction: ParetoObjectiveDirection
): boolean => direction === "maximize" ? left > right : left < right;

const isWorse = (
    left: number,
    right: number,
    direction: ParetoObjectiveDirection
): boolean => direction === "maximize" ? left < right : left > right;

const dominates = (
    left: ParetoCandidate,
    right: ParetoCandidate,
    activeObjectives: readonly ParetoObjective[]
): boolean =>
    activeObjectives.every((objective) =>
        !isWorse(
            left.objectives[objective] as number,
            right.objectives[objective] as number,
            OBJECTIVES[objective]
        )
    ) &&
    activeObjectives.some((objective) =>
        isBetter(
            left.objectives[objective] as number,
            right.objectives[objective] as number,
            OBJECTIVES[objective]
        )
    );

const assignDominance = (
    candidates: readonly ParetoCandidate[],
    activeObjectives: readonly ParetoObjective[]
): void => {
    for (let leftIndex = 0; leftIndex < candidates.length; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < candidates.length; rightIndex += 1) {
            const left = candidates[leftIndex];
            const right = candidates[rightIndex];

            if (dominates(left, right, activeObjectives)) {
                left.dominates.push(right.id);
                right.dominatedBy.push(left.id);
            } else if (dominates(right, left, activeObjectives)) {
                right.dominates.push(left.id);
                left.dominatedBy.push(right.id);
            }
        }
    }

    for (const candidate of candidates) {
        candidate.dominates.sort();
        candidate.dominatedBy.sort();
    }
};

const buildFronts = (candidates: readonly ParetoCandidate[]): string[][] => {
    const remaining = new Set(candidates.map((candidate) => candidate.id));
    const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
    const fronts: string[][] = [];

    while (remaining.size > 0) {
        const front = [...remaining]
            .filter((candidateIdInFront) => {
                const candidate = byId.get(candidateIdInFront) as ParetoCandidate;
                return candidate.dominatedBy.every((dominatorId) => !remaining.has(dominatorId));
            })
            .sort();
        const frontIndex = fronts.length;

        for (const candidateIdInFront of front) {
            const candidate = byId.get(candidateIdInFront) as ParetoCandidate;
            candidate.rank = frontIndex + 1;
            candidate.front = frontIndex;
            remaining.delete(candidateIdInFront);
        }

        fronts.push(front);
    }

    return fronts;
};

const finiteDistance = (candidate: ParetoCandidate): number =>
    candidate.crowdingDistance === "Infinity" ? 0 : candidate.crowdingDistance ?? 0;

const assignCrowdingDistance = (
    candidates: readonly ParetoCandidate[],
    fronts: readonly string[][],
    activeObjectives: readonly ParetoObjective[]
): void => {
    const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));

    for (const front of fronts) {
        for (const candidateIdInFront of front) {
            (byId.get(candidateIdInFront) as ParetoCandidate).crowdingDistance = 0;
        }

        if (front.length <= 2) {
            for (const candidateIdInFront of front) {
                (byId.get(candidateIdInFront) as ParetoCandidate).crowdingDistance = "Infinity";
            }
            continue;
        }

        for (const objective of activeObjectives) {
            const sorted = [...front].sort((leftId, rightId) => {
                const left = (byId.get(leftId) as ParetoCandidate).objectives[objective] as number;
                const right = (byId.get(rightId) as ParetoCandidate).objectives[objective] as number;
                return OBJECTIVES[objective] === "maximize" ? right - left : left - right;
            });
            const values = sorted.map((id) =>
                (byId.get(id) as ParetoCandidate).objectives[objective] as number
            );
            const range = Math.max(...values) - Math.min(...values);

            (byId.get(sorted[0]) as ParetoCandidate).crowdingDistance = "Infinity";
            (byId.get(sorted[sorted.length - 1]) as ParetoCandidate).crowdingDistance = "Infinity";
            if (range === 0) {
                continue;
            }

            for (let index = 1; index < sorted.length - 1; index += 1) {
                const candidate = byId.get(sorted[index]) as ParetoCandidate;
                if (candidate.crowdingDistance === "Infinity") {
                    continue;
                }

                candidate.crowdingDistance = Number(
                    (finiteDistance(candidate) + Math.abs(values[index + 1] - values[index - 1]) / range)
                        .toFixed(6)
                );
            }
        }
    }
};

export const computeParetoOptimization = (
    runtimes: readonly RuntimeMetrics[]
): ParetoOptimizationResult => {
    if (runtimes.length === 0) {
        return {
            paretoOptimizationVersion: PARETO_OPTIMIZATION_VERSION,
        };
    }

    const activeObjectives = comparableObjectives(runtimes);
    const candidates = runtimes.map((runtime) => buildCandidate(runtime, activeObjectives));
    const invalidReason = validateCandidateSet(runtimes, candidates, activeObjectives);

    if (invalidReason !== undefined) {
        return unavailableResult(activeObjectives, candidates, invalidReason);
    }

    assignDominance(candidates, activeObjectives);
    const fronts = buildFronts(candidates);
    assignCrowdingDistance(candidates, fronts, activeObjectives);

    return {
        paretoOptimizationVersion: PARETO_OPTIMIZATION_VERSION,
        paretoOptimization: {
            objectiveVersion: PARETO_OPTIMIZATION_VERSION,
            objectives: OBJECTIVES,
            activeObjectives,
            omittedObjectives: OBJECTIVE_NAMES.filter((objective) =>
                !activeObjectives.includes(objective)
            ),
            candidates,
            fronts,
            selectedCandidateIds: fronts[0] ?? [],
        },
    };
};
