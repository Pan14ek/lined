import type {
    RuntimeMetrics,
    RuntimeMetricSummary,
} from "./runtimeScoring";

export const PARETO_OPTIMIZATION_VERSION = "pareto-baseline-v1";

type ParetoObjective =
    | "latency_p95_ms"
    | "latency_p99_ms"
    | "error_rate"
    | "throughput_rps"
    | "availability"
    | "restart_count"
    | "cpu_utilization"
    | "memory_utilization";

type ParetoObjectiveDirection = "minimize" | "maximize";

type ParetoObjectiveDefinition = {
    field: ParetoObjective;
    direction: ParetoObjectiveDirection;
};

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

type DominanceState = {
    candidate: ParetoCandidate;
    dominates: Set<string>;
    dominatedByCount: number;
};

const OBJECTIVE_DEFINITIONS: readonly ParetoObjectiveDefinition[] = [
    {field: "latency_p95_ms", direction: "minimize"},
    {field: "latency_p99_ms", direction: "minimize"},
    {field: "error_rate", direction: "minimize"},
    {field: "throughput_rps", direction: "maximize"},
    {field: "availability", direction: "maximize"},
    {field: "restart_count", direction: "minimize"},
    {field: "cpu_utilization", direction: "minimize"},
    {field: "memory_utilization", direction: "minimize"},
];

const objectiveDirections = (): Record<ParetoObjective, ParetoObjectiveDirection> =>
    Object.fromEntries(
        OBJECTIVE_DEFINITIONS.map((definition) => [definition.field, definition.direction])
    ) as Record<ParetoObjective, ParetoObjectiveDirection>;

const objectiveValue = (
    summary: RuntimeMetricSummary,
    objective: ParetoObjective
): number | undefined => summary[objective];

const candidateId = (runtime: RuntimeMetrics): string =>
    `${runtime.scenario}:${runtime.workload}:${runtime.source}`;

const buildCandidate = (
    runtime: RuntimeMetrics,
    activeObjectives: readonly ParetoObjective[]
): ParetoCandidate => {
    const objectives: Partial<Record<ParetoObjective, number>> = {};
    const missingObjectives: ParetoObjective[] = [];

    for (const objective of activeObjectives) {
        const value = objectiveValue(runtime.summary, objective);
        if (value === undefined) {
            missingObjectives.push(objective);
        } else {
            objectives[objective] = value;
        }
    }

    return {
        id: candidateId(runtime),
        scenario: runtime.scenario,
        workload: runtime.workload,
        source: runtime.source,
        objectives,
        missingObjectives,
        dominates: [],
        dominatedBy: [],
    };
};

const activeObjectivesFor = (runtimes: readonly RuntimeMetrics[]): ParetoObjective[] =>
    OBJECTIVE_DEFINITIONS
        .map((definition) => definition.field)
        .filter((objective) =>
            runtimes.every((runtime) => objectiveValue(runtime.summary, objective) !== undefined)
        );

const compareObjective = (
    left: number,
    right: number,
    direction: ParetoObjectiveDirection
): number => {
    if (left === right) {
        return 0;
    }

    if (direction === "maximize") {
        return left > right ? 1 : -1;
    }

    return left < right ? 1 : -1;
};

const dominates = (
    left: ParetoCandidate,
    right: ParetoCandidate,
    activeObjectives: readonly ParetoObjective[],
    directions: Record<ParetoObjective, ParetoObjectiveDirection>
): boolean => {
    let betterInOneObjective = false;

    for (const objective of activeObjectives) {
        const leftValue = left.objectives[objective];
        const rightValue = right.objectives[objective];

        if (leftValue === undefined || rightValue === undefined) {
            return false;
        }

        const comparison = compareObjective(leftValue, rightValue, directions[objective]);
        if (comparison < 0) {
            return false;
        }
        if (comparison > 0) {
            betterInOneObjective = true;
        }
    }

    return betterInOneObjective;
};

const sortCandidateIds = (ids: Iterable<string>): string[] => [...ids].sort();

const nonDominatedSort = (
    candidates: readonly ParetoCandidate[],
    activeObjectives: readonly ParetoObjective[],
    directions: Record<ParetoObjective, ParetoObjectiveDirection>
): string[][] => {
    const states = new Map<string, DominanceState>();

    for (const candidate of candidates) {
        states.set(candidate.id, {
            candidate,
            dominates: new Set<string>(),
            dominatedByCount: 0,
        });
    }

    for (const left of candidates) {
        const leftState = states.get(left.id) as DominanceState;
        for (const right of candidates) {
            if (left.id === right.id) {
                continue;
            }
            if (dominates(left, right, activeObjectives, directions)) {
                leftState.dominates.add(right.id);
            } else if (dominates(right, left, activeObjectives, directions)) {
                leftState.dominatedByCount += 1;
            }
        }
    }

    const fronts: string[][] = [];
    let currentFront = sortCandidateIds(
        [...states.values()]
            .filter((state) => state.dominatedByCount === 0)
            .map((state) => state.candidate.id)
    );
    let frontIndex = 0;

    while (currentFront.length > 0) {
        fronts.push(currentFront);
        for (const candidateIdInFront of currentFront) {
            const state = states.get(candidateIdInFront) as DominanceState;
            state.candidate.rank = frontIndex + 1;
            state.candidate.front = frontIndex;
            state.candidate.dominates = sortCandidateIds(state.dominates);

            for (const dominatedId of state.dominates) {
                const dominatedState = states.get(dominatedId) as DominanceState;
                dominatedState.dominatedByCount -= 1;
            }
        }

        currentFront = sortCandidateIds(
            [...states.values()]
                .filter((state) =>
                    state.dominatedByCount === 0 &&
                    state.candidate.rank === undefined
                )
                .map((state) => state.candidate.id)
        );
        frontIndex += 1;
    }

    for (const candidate of candidates) {
        candidate.dominatedBy = sortCandidateIds(
            candidates
                .filter((other) =>
                    other.id !== candidate.id &&
                    dominates(other, candidate, activeObjectives, directions)
                )
                .map((other) => other.id)
        );
    }

    return fronts;
};

const crowdingDistanceForFront = (
    front: readonly string[],
    candidatesById: Map<string, ParetoCandidate>,
    activeObjectives: readonly ParetoObjective[],
    directions: Record<ParetoObjective, ParetoObjectiveDirection>
): void => {
    for (const candidateIdInFront of front) {
        const candidate = candidatesById.get(candidateIdInFront) as ParetoCandidate;
        candidate.crowdingDistance = 0;
    }

    if (front.length <= 2) {
        for (const candidateIdInFront of front) {
            const candidate = candidatesById.get(candidateIdInFront) as ParetoCandidate;
            candidate.crowdingDistance = "Infinity";
        }
        return;
    }

    for (const objective of activeObjectives) {
        const sorted = [...front].sort((leftId, rightId) => {
            const left = candidatesById.get(leftId) as ParetoCandidate;
            const right = candidatesById.get(rightId) as ParetoCandidate;
            const leftValue = left.objectives[objective] as number;
            const rightValue = right.objectives[objective] as number;
            const direction = directions[objective];
            return direction === "maximize" ? rightValue - leftValue : leftValue - rightValue;
        });
        const first = candidatesById.get(sorted[0]) as ParetoCandidate;
        const last = candidatesById.get(sorted[sorted.length - 1]) as ParetoCandidate;
        const min = Math.min(
            ...sorted.map((id) => (candidatesById.get(id) as ParetoCandidate).objectives[objective] as number)
        );
        const max = Math.max(
            ...sorted.map((id) => (candidatesById.get(id) as ParetoCandidate).objectives[objective] as number)
        );
        const range = max - min;

        first.crowdingDistance = "Infinity";
        last.crowdingDistance = "Infinity";
        if (range === 0) {
            continue;
        }

        for (let index = 1; index < sorted.length - 1; index += 1) {
            const candidate = candidatesById.get(sorted[index]) as ParetoCandidate;
            if (candidate.crowdingDistance === "Infinity") {
                continue;
            }

            const previous = candidatesById.get(sorted[index - 1]) as ParetoCandidate;
            const next = candidatesById.get(sorted[index + 1]) as ParetoCandidate;
            const previousValue = previous.objectives[objective] as number;
            const nextValue = next.objectives[objective] as number;
            candidate.crowdingDistance = Number(
                ((candidate.crowdingDistance as number) +
                    Math.abs(nextValue - previousValue) / range).toFixed(6)
            );
        }
    }
};

const assignCrowdingDistances = (
    candidates: readonly ParetoCandidate[],
    fronts: readonly string[][],
    activeObjectives: readonly ParetoObjective[],
    directions: Record<ParetoObjective, ParetoObjectiveDirection>
): void => {
    const candidatesById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
    for (const front of fronts) {
        crowdingDistanceForFront(front, candidatesById, activeObjectives, directions);
    }
};

const selectedCandidateIds = (candidates: readonly ParetoCandidate[]): string[] =>
    candidates
        .filter((candidate) => candidate.rank === 1)
        .sort((left, right) => {
            const leftDistance = left.crowdingDistance === "Infinity"
                ? Number.POSITIVE_INFINITY
                : left.crowdingDistance ?? 0;
            const rightDistance = right.crowdingDistance === "Infinity"
                ? Number.POSITIVE_INFINITY
                : right.crowdingDistance ?? 0;
            if (rightDistance !== leftDistance) {
                return rightDistance - leftDistance;
            }
            return left.id.localeCompare(right.id);
        })
        .map((candidate) => candidate.id);

const unavailableResult = (
    directions: Record<ParetoObjective, ParetoObjectiveDirection>,
    activeObjectives: ParetoObjective[],
    omittedObjectives: ParetoObjective[],
    candidates: ParetoCandidate[],
    reason: string
): ParetoOptimizationResult => ({
    paretoOptimizationVersion: PARETO_OPTIMIZATION_VERSION,
    paretoOptimization: {
        objectiveVersion: PARETO_OPTIMIZATION_VERSION,
        objectives: directions,
        activeObjectives,
        omittedObjectives,
        candidates,
        fronts: [],
        selectedCandidateIds: [],
        reason,
    },
});

const hasDuplicateCandidateIds = (candidates: readonly ParetoCandidate[]): boolean =>
    new Set(candidates.map((candidate) => candidate.id)).size !== candidates.length;

const hasMixedComparisonContext = (runtimes: readonly RuntimeMetrics[]): boolean =>
    new Set(runtimes.map((runtime) => runtime.workload)).size > 1 ||
    new Set(runtimes.map((runtime) => runtime.source)).size > 1;

export const computeParetoOptimization = (
    runtimes: readonly RuntimeMetrics[]
): ParetoOptimizationResult => {
    const directions = objectiveDirections();

    if (runtimes.length === 0) {
        return {
            paretoOptimizationVersion: PARETO_OPTIMIZATION_VERSION,
        };
    }

    const activeObjectives = activeObjectivesFor(runtimes);
    const omittedObjectives = OBJECTIVE_DEFINITIONS
        .map((definition) => definition.field)
        .filter((objective) => !activeObjectives.includes(objective));
    const candidates = runtimes.map((runtime) => buildCandidate(runtime, activeObjectives));

    if (runtimes.length < 2) {
        return unavailableResult(
            directions,
            activeObjectives,
            omittedObjectives,
            candidates,
            "at least two runtime scenario summaries are required"
        );
    }

    if (hasDuplicateCandidateIds(candidates)) {
        return unavailableResult(
            directions,
            activeObjectives,
            omittedObjectives,
            candidates,
            "runtime scenario summaries must have unique scenario/workload/source identities"
        );
    }

    if (hasMixedComparisonContext(runtimes)) {
        return unavailableResult(
            directions,
            activeObjectives,
            omittedObjectives,
            candidates,
            "runtime scenario summaries must share the same workload and source"
        );
    }

    if (activeObjectives.length === 0) {
        return unavailableResult(
            directions,
            activeObjectives,
            omittedObjectives,
            candidates,
            "no objective is present for every candidate"
        );
    }

    const fronts = nonDominatedSort(candidates, activeObjectives, directions);
    assignCrowdingDistances(candidates, fronts, activeObjectives, directions);

    return {
        paretoOptimizationVersion: PARETO_OPTIMIZATION_VERSION,
        paretoOptimization: {
            objectiveVersion: PARETO_OPTIMIZATION_VERSION,
            objectives: directions,
            activeObjectives,
            omittedObjectives,
            candidates,
            fronts,
            selectedCandidateIds: selectedCandidateIds(candidates),
        },
    };
};
