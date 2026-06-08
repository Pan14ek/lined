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

type RuntimeScoreWeight = {
    objective: ParetoObjective;
    weight: number;
};

const RUNTIME_SCORE_WEIGHTS: readonly RuntimeScoreWeight[] = [
    {objective: "latency_p95_ms", weight: 0.2},
    {objective: "latency_p99_ms", weight: 0.15},
    {objective: "error_rate", weight: 0.2},
    {objective: "throughput_rps", weight: 0.15},
    {objective: "availability", weight: 0.15},
    {objective: "restart_count", weight: 0.1},
    {objective: "cpu_utilization", weight: 0.025},
    {objective: "memory_utilization", weight: 0.025},
];

const reasonCode = (reason: string | undefined): ReasonCode => {
    if (reason === undefined) {
        return "invalid-pareto-set";
    }

    if (reason.includes("at least two")) {
        return "missing-pareto-input";
    }

    if (reason.includes("unique scenario/workload/source")) {
        return "duplicate-candidate-identities";
    }

    if (reason.includes("share the same workload and source")) {
        return "mixed-workload-or-source";
    }

    if (reason.includes("no objective")) {
        return "no-comparable-objectives";
    }

    return "invalid-pareto-set";
};

const emptyMetadata = (
    paretoStatus: AvailabilityStatus,
    comparatorStatus: AvailabilityStatus,
    classification: UsefulnessClassification,
    reasonCodes: ReasonCode[],
    paretoOptimization: ParetoOptimizationMetadata | undefined,
    actionabilitySummary: string
): DecisionUsefulnessMetadata => ({
    paretoStatus,
    comparatorStatus,
    usefulnessClassification: classification,
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

const weightFor = (objective: ParetoObjective): number | undefined =>
    RUNTIME_SCORE_WEIGHTS.find((candidate) => candidate.objective === objective)?.weight;

const objectiveValue = (
    candidate: ParetoCandidate,
    objective: ParetoObjective
): number => candidate.objectives[objective] as number;

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

    if (paretoOptimization.objectives[objective] === "maximize") {
        return (current - minimum) / (maximum - minimum);
    }

    return (maximum - current) / (maximum - minimum);
};

const compareRankingRows = (
    left: FixedScalarRankingRow,
    right: FixedScalarRankingRow
): number => {
    if (right.score !== left.score) {
        return right.score - left.score;
    }

    return left.candidateId.localeCompare(right.candidateId);
};

const buildFixedScalarRanking = (
    paretoOptimization: ParetoOptimizationMetadata,
    comparatorObjectives: readonly ParetoObjective[]
): FixedScalarRankingRow[] => {
    const totalWeight = comparatorObjectives.reduce(
        (total, objective) => total + (weightFor(objective) as number),
        0
    );
    return paretoOptimization.candidates
        .map((candidate) => {
            const score = comparatorObjectives.reduce(
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
            ) / totalWeight;

            return {
                candidateId: candidate.id,
                rank: 0,
                score: Number(score.toFixed(6)),
            };
        })
        .sort(compareRankingRows)
        .map((row, index) => ({
            ...row,
            rank: index + 1,
        }));
};

const compareToScalarTop = (
    candidate: ParetoCandidate,
    scalarTop: ParetoCandidate,
    paretoOptimization: ParetoOptimizationMetadata,
    comparatorObjectives: readonly ParetoObjective[]
): Pick<
    DecisionUsefulnessCandidateRow,
    "betterThanScalarTop" | "worseThanScalarTop" | "equalToScalarTop"
> => {
    const betterThanScalarTop: ParetoObjective[] = [];
    const worseThanScalarTop: ParetoObjective[] = [];
    const equalToScalarTop: ParetoObjective[] = [];

    for (const objective of comparatorObjectives) {
        const candidateValue = objectiveValue(candidate, objective);
        const scalarValue = objectiveValue(scalarTop, objective);
        const direction = paretoOptimization.objectives[objective];

        if (candidateValue === scalarValue) {
            equalToScalarTop.push(objective);
        } else if (
            (direction === "maximize" && candidateValue > scalarValue) ||
            (direction === "minimize" && candidateValue < scalarValue)
        ) {
            betterThanScalarTop.push(objective);
        } else {
            worseThanScalarTop.push(objective);
        }
    }

    return {
        betterThanScalarTop,
        worseThanScalarTop,
        equalToScalarTop,
    };
};

const objectiveList = (objectives: readonly ParetoObjective[]): string =>
    objectives.length === 0 ? "no comparable objectives" : objectives.join(", ");

const rationale = (
    candidateId: string,
    scalarTopCandidateId: string,
    comparison: Pick<
        DecisionUsefulnessCandidateRow,
        "betterThanScalarTop" | "worseThanScalarTop" | "equalToScalarTop"
    >
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

const hasConcreteTradeoff = (row: DecisionUsefulnessCandidateRow): boolean =>
    row.betterThanScalarTop.length > 0 && row.worseThanScalarTop.length > 0;

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

    if (alternatives.some(hasConcreteTradeoff)) {
        return "multiple-tradeoff-alternatives";
    }

    return "none";
};

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

export const computeDecisionUsefulness = (
    paretoOptimizationResult: ParetoOptimizationResult
): DecisionUsefulnessResult => {
    const paretoOptimization = paretoOptimizationResult.paretoOptimization;

    if (paretoOptimization === undefined) {
        return {
            decisionUsefulnessVersion: DECISION_USEFULNESS_VERSION,
            decisionUsefulness: emptyMetadata(
                "unavailable",
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
            decisionUsefulness: emptyMetadata(
                "unavailable",
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
            decisionUsefulness: emptyMetadata(
                "available",
                "unavailable",
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
            decisionUsefulness: emptyMetadata(
                "available",
                "unavailable",
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
