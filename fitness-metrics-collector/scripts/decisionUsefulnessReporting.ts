import type {
    ParetoCandidate,
    ParetoObjective,
    ParetoOptimizationMetadata,
    ParetoOptimizationResult,
} from "./paretoOptimization";

export const DECISION_USEFULNESS_VERSION = "decision-usefulness-v1";
export const DECISION_USEFULNESS_COMPARATOR = "fixed-runtime-v1-reporting";

type AvailabilityStatus = "available" | "unavailable";
type UsefulnessClassification =
    | "unavailable"
    | "none"
    | "single-best-only"
    | "multiple-tradeoff-alternatives";

type ReasonCode =
    | "missing-pareto-input"
    | "invalid-pareto-set"
    | "duplicate-candidate-identities"
    | "mixed-workload-or-source"
    | "no-comparable-objectives"
    | "missing-comparator-weights"
    | "unavailable-scalar-ranking";

type FixedScalarRankingRow = {
    candidateId: string;
    rank: number;
    score: number;
};

export type DecisionUsefulnessCandidateRow = {
    candidateId: string;
    paretoRank?: number;
    isParetoSelected: boolean;
    fixedScalarRank?: number;
    fixedScalarScore?: number;
    betterThanScalarTop: ParetoObjective[];
    worseThanScalarTop: ParetoObjective[];
    equalToScalarTop: ParetoObjective[];
    rationale: string;
};

export type DecisionUsefulnessMetadata = {
    paretoStatus: AvailabilityStatus;
    comparatorStatus: AvailabilityStatus;
    usefulnessClassification: UsefulnessClassification;
    comparator: typeof DECISION_USEFULNESS_COMPARATOR;
    reasonCodes: ReasonCode[];
    candidateCount: number;
    activeObjectives: ParetoObjective[];
    comparatorObjectives: ParetoObjective[];
    comparatorOmittedObjectives: ParetoObjective[];
    paretoSelectedCandidateIds: string[];
    fixedScalarRanking: FixedScalarRankingRow[];
    fixedScalarTopCandidateId?: string;
    tradeoffAlternativeIds: string[];
    candidates: DecisionUsefulnessCandidateRow[];
    actionabilitySummary: string;
};

export type DecisionUsefulnessResult = {
    decisionUsefulnessVersion: typeof DECISION_USEFULNESS_VERSION;
    decisionUsefulness: DecisionUsefulnessMetadata;
};

type ObjectiveComparison = Pick<
    DecisionUsefulnessCandidateRow,
    "betterThanScalarTop" | "worseThanScalarTop" | "equalToScalarTop"
>;

const RUNTIME_SCORE_WEIGHTS: Partial<Record<ParetoObjective, number>> = {
    latency_p95_ms: 0.2,
    latency_p99_ms: 0.15,
    error_rate: 0.2,
    throughput_rps: 0.15,
    availability: 0.15,
    restart_count: 0.1,
    cpu_utilization: 0.025,
    memory_utilization: 0.025,
};

const REASON_CODE_PATTERNS: readonly [string, ReasonCode][] = [
    ["at least two", "missing-pareto-input"],
    ["unique scenario/workload/source", "duplicate-candidate-identities"],
    ["share the same workload and source", "mixed-workload-or-source"],
    ["no objective", "no-comparable-objectives"],
];

/** Maps Pareto unavailable text to the stable decision-usefulness reason code. */
const reasonCode = (reason: string | undefined): ReasonCode =>
    REASON_CODE_PATTERNS.find(([pattern]) => reason?.includes(pattern))?.[1] ??
    "invalid-pareto-set";

/** Builds a complete unavailable report while preserving any Pareto context that exists. */
const unavailableMetadata = (
    paretoStatus: AvailabilityStatus,
    comparatorStatus: AvailabilityStatus,
    reasonCodes: ReasonCode[],
    paretoOptimization: ParetoOptimizationMetadata | undefined,
    actionabilitySummary: string
): DecisionUsefulnessMetadata => ({
    paretoStatus,
    comparatorStatus,
    usefulnessClassification: "unavailable",
    comparator: DECISION_USEFULNESS_COMPARATOR,
    reasonCodes,
    candidateCount: paretoOptimization?.candidates.length ?? 0,
    activeObjectives: paretoOptimization?.activeObjectives ?? [],
    comparatorObjectives: [],
    comparatorOmittedObjectives: paretoOptimization?.activeObjectives ?? [],
    paretoSelectedCandidateIds: paretoOptimization?.selectedCandidateIds ?? [],
    fixedScalarRanking: [],
    tradeoffAlternativeIds: [],
    candidates: [],
    actionabilitySummary,
});

/** Returns the fixed runtime-v1 reporting weight for one objective. */
const weightFor = (objective: ParetoObjective): number | undefined =>
    RUNTIME_SCORE_WEIGHTS[objective];

/** Reads an already-validated objective value from a Pareto candidate. */
const objectiveValue = (
    candidate: ParetoCandidate,
    objective: ParetoObjective
): number => candidate.objectives[objective] as number;

/** Normalizes an objective to [0, 1], where 1 is best for the objective direction. */
const normalizedObjectiveValue = (
    candidate: ParetoCandidate,
    candidates: readonly ParetoCandidate[],
    paretoOptimization: ParetoOptimizationMetadata,
    objective: ParetoObjective
): number => {
    const values = candidates.map((candidateWithValue) =>
        objectiveValue(candidateWithValue, objective)
    );
    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
    const current = objectiveValue(candidate, objective);

    if (maximum === minimum) {
        return 1;
    }

    return paretoOptimization.objectives[objective] === "maximize"
        ? (current - minimum) / (maximum - minimum)
        : (maximum - current) / (maximum - minimum);
};

/** Sorts fixed scalar rows without consulting Pareto rank or crowding distance. */
const compareRankingRows = (
    left: FixedScalarRankingRow,
    right: FixedScalarRankingRow
): number =>
    right.score === left.score
        ? left.candidateId.localeCompare(right.candidateId)
        : right.score - left.score;

/** Computes the fixed scalar reporting score for a candidate over comparator objectives. */
const scalarScore = (
    candidate: ParetoCandidate,
    paretoOptimization: ParetoOptimizationMetadata,
    comparatorObjectives: readonly ParetoObjective[],
    totalWeight: number
): number => {
    const weightedScore = comparatorObjectives.reduce(
        (total, objective) =>
            total +
            normalizedObjectiveValue(
                candidate,
                paretoOptimization.candidates,
                paretoOptimization,
                objective
            ) *
            (weightFor(objective) as number),
        0
    );

    return Number((weightedScore / totalWeight).toFixed(6));
};

/** Ranks all comparable candidates by the fixed runtime-v1 reporting comparator. */
const buildFixedScalarRanking = (
    paretoOptimization: ParetoOptimizationMetadata,
    comparatorObjectives: readonly ParetoObjective[]
): FixedScalarRankingRow[] => {
    const totalWeight = comparatorObjectives.reduce(
        (total, objective) => total + (weightFor(objective) as number),
        0
    );

    return paretoOptimization.candidates
        .map((candidate) => ({
            candidateId: candidate.id,
            rank: 0,
            score: scalarScore(
                candidate,
                paretoOptimization,
                comparatorObjectives,
                totalWeight
            ),
        }))
        .sort(compareRankingRows)
        .map((row, index) => ({
            ...row,
            rank: index + 1,
        }));
};

/** Compares one candidate's objectives with the fixed scalar top candidate. */
const compareToScalarTop = (
    candidate: ParetoCandidate,
    scalarTop: ParetoCandidate,
    paretoOptimization: ParetoOptimizationMetadata,
    comparatorObjectives: readonly ParetoObjective[]
): ObjectiveComparison => {
    const comparison: ObjectiveComparison = {
        betterThanScalarTop: [],
        worseThanScalarTop: [],
        equalToScalarTop: [],
    };

    for (const objective of comparatorObjectives) {
        const candidateValue = objectiveValue(candidate, objective);
        const scalarValue = objectiveValue(scalarTop, objective);
        const direction = paretoOptimization.objectives[objective];

        if (candidateValue === scalarValue) {
            comparison.equalToScalarTop.push(objective);
        } else if (
            (direction === "maximize" && candidateValue > scalarValue) ||
            (direction === "minimize" && candidateValue < scalarValue)
        ) {
            comparison.betterThanScalarTop.push(objective);
        } else {
            comparison.worseThanScalarTop.push(objective);
        }
    }

    return comparison;
};

/** Formats objective names for the human-readable candidate rationale. */
const objectiveList = (objectives: readonly ParetoObjective[]): string =>
    objectives.length === 0 ? "no comparable objectives" : objectives.join(", ");

/** Explains one candidate's trade-off against the fixed scalar top candidate. */
const rationale = (
    candidateId: string,
    scalarTopCandidateId: string,
    comparison: ObjectiveComparison
): string => {
    if (candidateId === scalarTopCandidateId) {
        return "Fixed scalar top candidate; use as the single-score reference point.";
    }

    if (
        comparison.betterThanScalarTop.length === 0 &&
        comparison.worseThanScalarTop.length === 0
    ) {
        return "Equivalent to the fixed scalar top across comparator objectives.";
    }

    return `Improves ${objectiveList(comparison.betterThanScalarTop)} while sacrificing ` +
        `${objectiveList(comparison.worseThanScalarTop)} compared with fixed scalar top.`;
};

/** Creates per-candidate rows with scalar rank, Pareto selection, and trade-off rationale. */
const buildCandidateRows = (
    paretoOptimization: ParetoOptimizationMetadata,
    ranking: readonly FixedScalarRankingRow[],
    comparatorObjectives: readonly ParetoObjective[]
): DecisionUsefulnessCandidateRow[] => {
    const byId = new Map(paretoOptimization.candidates.map((candidate) => [candidate.id, candidate]));
    const rankById = new Map(ranking.map((row) => [row.candidateId, row]));
    const selected = new Set(paretoOptimization.selectedCandidateIds);
    const scalarTop = byId.get(ranking[0].candidateId) as ParetoCandidate;

    return paretoOptimization.candidates
        .map((candidate) => {
            const comparison = compareToScalarTop(
                candidate,
                scalarTop,
                paretoOptimization,
                comparatorObjectives
            );
            const scalarRanking = rankById.get(candidate.id);

            return {
                candidateId: candidate.id,
                paretoRank: candidate.rank,
                isParetoSelected: selected.has(candidate.id),
                fixedScalarRank: scalarRanking?.rank,
                fixedScalarScore: scalarRanking?.score,
                ...comparison,
                rationale: rationale(candidate.id, scalarTop.id, comparison),
            };
        })
        .sort((left, right) => left.candidateId.localeCompare(right.candidateId));
};

/** Returns whether a row has both an improvement and a sacrifice versus scalar top. */
const hasConcreteTradeoff = (row: DecisionUsefulnessCandidateRow): boolean =>
    row.betterThanScalarTop.length > 0 && row.worseThanScalarTop.length > 0;

/** Classifies the extra decision value Pareto provides over the scalar top. */
const classifyUsefulness = (
    selectedIds: readonly string[],
    scalarTopCandidateId: string,
    candidateRows: readonly DecisionUsefulnessCandidateRow[]
): UsefulnessClassification => {
    if (selectedIds.length === 0) {
        return "none";
    }

    const alternatives = candidateRows.filter((row) =>
        row.isParetoSelected && row.candidateId !== scalarTopCandidateId
    );

    if (alternatives.length === 0) {
        return "single-best-only";
    }

    return alternatives.some(hasConcreteTradeoff)
        ? "multiple-tradeoff-alternatives"
        : "none";
};

/** Summarizes the decision-usefulness classification for logs and reports. */
const summary = (
    classification: UsefulnessClassification,
    alternativeIds: readonly string[],
    scalarTopCandidateId: string | undefined
): string => {
    if (classification === "unavailable") {
        return "Decision-usefulness reporting is unavailable for this Pareto input.";
    }

    if (classification === "multiple-tradeoff-alternatives") {
        return `Pareto exposes ${alternativeIds.length} trade-off alternative(s) beyond fixed scalar top ` +
            `${scalarTopCandidateId}.`;
    }

    if (classification === "single-best-only") {
        return `Pareto confirms the fixed scalar top candidate ${scalarTopCandidateId}.`;
    }

    return "Pareto does not expose an actionable trade-off alternative for this candidate set.";
};

/** Computes the additive decision-usefulness report from the Pareto output. */
export const computeDecisionUsefulness = (
    paretoOptimizationResult: ParetoOptimizationResult
): DecisionUsefulnessResult => {
    const paretoOptimization = paretoOptimizationResult.paretoOptimization;

    if (paretoOptimization === undefined) {
        return {
            decisionUsefulnessVersion: DECISION_USEFULNESS_VERSION,
            decisionUsefulness: unavailableMetadata(
                "unavailable",
                "unavailable",
                ["missing-pareto-input"],
                undefined,
                "Decision-usefulness reporting requires PARETO_RUNTIME_METRICS_JSONS input."
            ),
        };
    }

    if (paretoOptimization.reason !== undefined || paretoOptimization.fronts.length === 0) {
        const code = reasonCode(paretoOptimization.reason);
        return {
            decisionUsefulnessVersion: DECISION_USEFULNESS_VERSION,
            decisionUsefulness: unavailableMetadata(
                "unavailable",
                "unavailable",
                [code],
                paretoOptimization,
                `Decision-usefulness reporting is unavailable: ${paretoOptimization.reason ?? code}.`
            ),
        };
    }

    const comparatorObjectives = paretoOptimization.activeObjectives.filter((objective) =>
        weightFor(objective) !== undefined
    );
    const comparatorOmittedObjectives = paretoOptimization.activeObjectives.filter((objective) =>
        weightFor(objective) === undefined
    );

    if (comparatorObjectives.length === 0) {
        return {
            decisionUsefulnessVersion: DECISION_USEFULNESS_VERSION,
            decisionUsefulness: unavailableMetadata(
                "available",
                "unavailable",
                ["missing-comparator-weights"],
                paretoOptimization,
                "No Pareto objective has a fixed runtime reporting comparator weight."
            ),
        };
    }

    const fixedScalarRanking = buildFixedScalarRanking(paretoOptimization, comparatorObjectives);
    if (fixedScalarRanking.length === 0) {
        return {
            decisionUsefulnessVersion: DECISION_USEFULNESS_VERSION,
            decisionUsefulness: unavailableMetadata(
                "available",
                "unavailable",
                ["unavailable-scalar-ranking"],
                paretoOptimization,
                "Fixed scalar reporting ranking could not be computed."
            ),
        };
    }

    const fixedScalarTopCandidateId = fixedScalarRanking[0].candidateId;
    const candidates = buildCandidateRows(
        paretoOptimization,
        fixedScalarRanking,
        comparatorObjectives
    );
    const tradeoffAlternativeIds = candidates
        .filter((candidate) =>
            candidate.isParetoSelected &&
            candidate.candidateId !== fixedScalarTopCandidateId &&
            hasConcreteTradeoff(candidate)
        )
        .map((candidate) => candidate.candidateId)
        .sort();
    const usefulnessClassification = classifyUsefulness(
        paretoOptimization.selectedCandidateIds,
        fixedScalarTopCandidateId,
        candidates
    );

    return {
        decisionUsefulnessVersion: DECISION_USEFULNESS_VERSION,
        decisionUsefulness: {
            paretoStatus: "available",
            comparatorStatus: "available",
            usefulnessClassification,
            comparator: DECISION_USEFULNESS_COMPARATOR,
            reasonCodes: [],
            candidateCount: paretoOptimization.candidates.length,
            activeObjectives: paretoOptimization.activeObjectives,
            comparatorObjectives,
            comparatorOmittedObjectives,
            paretoSelectedCandidateIds: paretoOptimization.selectedCandidateIds,
            fixedScalarRanking,
            fixedScalarTopCandidateId,
            tradeoffAlternativeIds,
            candidates,
            actionabilitySummary: summary(
                usefulnessClassification,
                tradeoffAlternativeIds,
                fixedScalarTopCandidateId
            ),
        },
    };
};
