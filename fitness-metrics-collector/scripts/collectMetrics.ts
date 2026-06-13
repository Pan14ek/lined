import fs from "node:fs";
import path from "node:path";
import {CosmosClient} from "@azure/cosmos";
import {
    computeAdaptiveFitness,
    parseAdaptiveFitnessContext,
    type AdaptiveFitnessContext,
    type AdaptiveFitnessMetadata,
    type AdaptiveFitnessResult,
    ADAPTIVE_FITNESS_SCORE_VERSION,
} from "./adaptiveScoring";
import {
    classifyRuntimeMetrics,
    computeRuntimeFitness,
    parseSloThresholds,
    RUNTIME_FITNESS_SCORE_VERSION,
    type RuntimeFitnessMetadata,
    type RuntimeFitnessResult,
    type RuntimeMetrics,
    type RuntimeMetricSummary,
} from "./runtimeScoring";
import {
    computeParetoOptimization,
    PARETO_OPTIMIZATION_VERSION,
    type ParetoOptimizationMetadata,
    type ParetoOptimizationResult,
} from "./paretoOptimization";
import {
    computeDecisionUsefulness,
    DECISION_USEFULNESS_VERSION,
    type DecisionUsefulnessMetadata,
    type DecisionUsefulnessResult,
} from "./decisionUsefulnessReporting";

/* =======================
   TYPES
======================= */
type FitnessScore = number | null;

type Metrics = {
    checkstyle_violations?: number;
    spotbugs_total?: number;
    spotbugs_total_classes?: number;
    jacoco_line_coverage?: number;
    sonar_cloud_main_branch_metrics?: SonarMetricsMap;
    sonar_cloud_current_branch_metrics?: SonarMetricsMap;
    current_branch_name?: string;
    sonar_diff?: MetricsDiffMap;
    runtime_metrics?: RuntimeMetrics;
};

type MetricsDocument = {
    id: string;
    timestamp: string;
    branch: string;
    commitHash?: string;
    pullRequestId?: string;
    metrics: Metrics;
    fitnessScore: FitnessScore;
    runtimeFitnessScore: FitnessScore;
    runtimeFitnessScoreVersion: typeof RUNTIME_FITNESS_SCORE_VERSION;
    runtimeFitness?: RuntimeFitnessMetadata;
    adaptiveFitnessScore: FitnessScore;
    adaptiveFitnessScoreVersion: typeof ADAPTIVE_FITNESS_SCORE_VERSION;
    adaptiveFitness?: AdaptiveFitnessMetadata;
    paretoOptimizationVersion: typeof PARETO_OPTIMIZATION_VERSION;
    paretoOptimization?: ParetoOptimizationMetadata;
    decisionUsefulnessVersion: typeof DECISION_USEFULNESS_VERSION;
    decisionUsefulness: DecisionUsefulnessMetadata;
    runtimeProvenance?: RuntimeProvenanceMetadata;
};

type RuntimeArtifactProvenanceStatus =
    | "manifest-linked"
    | "manifest-incomplete"
    | "manifest-missing"
    | "manifest-malformed"
    | "identity-mismatch"
    | "store-baseline-linked"
    | "store-baseline-partial";

type RuntimeArtifactProvenance = {
    status: RuntimeArtifactProvenanceStatus;
    manifestPath?: string;
    documentId?: string;
    timestamp?: string;
    commitHash?: string;
    imageTag?: string;
    configurationHash?: string;
    telemetryWindow?: {
        startedAt?: string;
        finishedAt?: string;
    };
    runtimeEvidenceVector?: RuntimeMetricSummary;
    missing?: string[];
};

type RuntimeProvenanceMetadata = {
    current?: RuntimeArtifactProvenance;
    baseline?: RuntimeArtifactProvenance;
    paretoCandidates?: Record<string, RuntimeArtifactProvenance>;
    scoring?: {
        thresholdVersion: string;
    };
};

type RuntimeArtifact = {
    runtimeMetrics: RuntimeMetrics;
    provenance?: RuntimeArtifactProvenance;
};

type RuntimeBaselineRecord = {
    runtimeMetrics: RuntimeMetrics;
    provenance: RuntimeArtifactProvenance;
};

type MetricsStore = {
    findStructuralBaseline(isMainBranch: boolean): Promise<Metrics | undefined>;
    findRuntimeBaseline(
        scenario: string,
        workload: string,
        source: string
    ): Promise<RuntimeBaselineRecord | undefined>;
    save(document: MetricsDocument): Promise<void>;
};

type SonarScope =
    | { kind: "branch"; name: string }
    | { kind: "pullRequest"; id: string };

type SonarPeriod = { index: number; value?: string; bestValue?: boolean };
type SonarMeasure = {
    metric: string;
    value?: string;
    bestValue?: boolean;
    periods?: SonarPeriod[];
};

type SonarResponse = {
    component?: {
        measures?: SonarMeasure[];
    };
};

type SonarMetricValue = string | number;
type SonarMetricsMap = Record<string, SonarMetricValue>;

type MetricDiff = {
    base?: number;
    current?: number;
    delta?: number;
};

type MetricsDiffMap = Record<string, MetricDiff>;

type Result = {
    metrics: Metrics;
    checkstyle_valid: boolean;
    spotbugs_valid: boolean;
};

type Config = {
    checkstylePath: string;
    spotbugsXmlPath: string;
    spotbugsHtmlPath: string;
    jacocoPath: string;
    runtimeMetricsJsonPath?: string;
    runtimeBaselineMetricsJsonPath?: string;
    paretoRuntimeMetricsJsonPaths: string[];
    runtimeBaselineScenario: string;
    runtimeOnly: boolean;
    adaptiveFitnessContext: AdaptiveFitnessContext;
    sloThresholdsJsonPath: string;
    metricsOutputJsonPath?: string;
    commitHash?: string;
    cosmosDbConnectionString?: string;
    pullRequestId?: string;
    branchName?: string;
};

/* =======================
   CONSTANTS
======================= */
const DEFAULT_PATHS = {
    CHECKSTYLE: "../backend/lined/build/reports/checkstyle/main.xml",
    SPOTBUGS_XML: "../backend/lined/build/reports/spotbugs/spotbugsMain.xml",
    SPOTBUGS_HTML: "../backend/lined/build/reports/spotbugs/spotbugsMain.html",
    JACOCO: "../backend/lined/build/reports/jacoco/test/jacocoTestReport.xml",
    SLO_THRESHOLDS: "../backend/lined/load-tests/runtime-scenarios/slo-thresholds-v1.json",
} as const;

const REGEX_PATTERNS = {
    CHECKSTYLE_ERROR: /<error\b/g,
    SPOTBUGS_ATTR: (attr: string) => new RegExp(String.raw`${attr}="(\d+)"`),
    SPOTBUGS_CLASSES: /in\s+(\d+)\s+classes\b/i,
    JACOCO_LINE: /<counter type="LINE" missed="(\d+)" covered="(\d+)"/,
} as const;

const EXIT_CODES = {
    SUCCESS: 0,
    SPOTBUGS_INVALID: 2,
} as const;

/* =======================
   UTILITIES
======================= */
const fileExists = (path: string): boolean => {
    return fs.existsSync(path);
};

const readFile = (path: string): string => {
    if (!fileExists(path)) {
        throw new Error(`File not found: ${path}`);
    }
    return fs.readFileSync(path, "utf-8");
};

const isEnabled = (value: string | undefined): boolean => {
    return value === "true" || value === "1" || value === "yes";
};

const extractNumber = (content: string, pattern: RegExp, errorMsg: string): number => {
    const match = pattern.exec(content);
    if (!match?.[1]) {
        throw new Error(errorMsg);
    }
    return Number(match[1]);
};

const countMatches = (content: string, pattern: RegExp): number => {
    let count = 0;

    // Reset lastIndex to ensure we start from the beginning
    pattern.lastIndex = 0;

    while (pattern.exec(content) !== null) {
        count++;
    }

    return count;
};

const parsePathList = (value: string | undefined): string[] => {
    if (value === undefined || value.trim() === "") {
        return [];
    }

    return value
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item !== "");
};

const getConfig = (): Config => {
    return {
        checkstylePath: process.env.CHECKSTYLE_XML ?? DEFAULT_PATHS.CHECKSTYLE,
        spotbugsXmlPath: process.env.SPOTBUGS_XML ?? DEFAULT_PATHS.SPOTBUGS_XML,
        spotbugsHtmlPath: process.env.SPOTBUGS_HTML ?? DEFAULT_PATHS.SPOTBUGS_HTML,
        jacocoPath: process.env.JACOCO_XML ?? DEFAULT_PATHS.JACOCO,
        runtimeMetricsJsonPath: process.env.RUNTIME_METRICS_JSON,
        runtimeBaselineMetricsJsonPath: process.env.RUNTIME_BASELINE_METRICS_JSON,
        paretoRuntimeMetricsJsonPaths: parsePathList(process.env.PARETO_RUNTIME_METRICS_JSONS),
        runtimeBaselineScenario: process.env.RUNTIME_BASELINE_SCENARIO ?? "fixed-medium",
        runtimeOnly: isEnabled(process.env.RUNTIME_ONLY),
        adaptiveFitnessContext: parseAdaptiveFitnessContext(process.env.ADAPTIVE_FITNESS_CONTEXT),
        sloThresholdsJsonPath: process.env.SLO_THRESHOLDS_JSON ?? DEFAULT_PATHS.SLO_THRESHOLDS,
        metricsOutputJsonPath: process.env.METRICS_OUTPUT_JSON,
        branchName: process.env.BRANCH_NAME,
        pullRequestId: process.env.PR_NUMBER,
        commitHash: process.env.GITHUB_SHA,
        cosmosDbConnectionString: process.env.COSMOS_DB_CONNECTION_STRING,
    };
};

/* ==============================
   CALCULATE THE FITNESS FUNCTION
================================= */
const clamp = (value: number, min: number, max: number): number =>
    Math.max(min, Math.min(max, value));

const normalize = (main: number, current: number, higherIsBetter: boolean): number => {
    if (main === 0 && current === 0) return 0;
    if (main === 0) {
        if (higherIsBetter) return current > 0 ? 1 : -1;
        return current > 0 ? -1 : 1;
    }
    const delta = higherIsBetter
        ? (current - main) / main
        : (main - current) / main;
    return clamp(delta, -1, 1);
};

const computeFitnessFunction = async (
    store: MetricsStore,
    config: Config,
    current: Metrics
): Promise<FitnessScore> => {
    const isMainBranch = config.branchName === "main";

    // Sonar metrics — always available live, no DB needed
    const mainSonar = current.sonar_cloud_main_branch_metrics ?? {};
    const currentSonar = current.sonar_cloud_current_branch_metrics ?? {};

    const mainCritical = toNumber(mainSonar["critical_violations"]) ?? 0;
    const currentCritical = toNumber(currentSonar["critical_violations"]) ?? 0;

    const mainSmells = toNumber(mainSonar["code_smells"]) ?? 0;
    const currentSmells = toNumber(currentSonar["code_smells"]) ?? 0;

    const mainDuplication = toNumber(mainSonar["duplicated_lines_density"]) ?? 0;
    const currentDuplication = toNumber(currentSonar["duplicated_lines_density"]) ?? 0;

    const snapshot = await store.findStructuralBaseline(isMainBranch);

    if (!snapshot) {
        console.log("[fitness] No main baseline in DB — using 0 for SpotBugs/Checkstyle baseline");
    }

    const mainSpotbugs = snapshot?.spotbugs_total ?? 0;
    const mainCheckstyle = snapshot?.checkstyle_violations ?? 0;
    const mainCoverage = snapshot?.jacoco_line_coverage ?? 0;

    const currentSpotbugs = current.spotbugs_total ?? 0;
    const currentCheckstyle = current.checkstyle_violations ?? 0;
    const currentCoverage = current.jacoco_line_coverage ?? 0;

    const F =
        0.25 * normalize(mainSpotbugs, currentSpotbugs, false) +
        0.25 * normalize(mainCritical, currentCritical, false) +
        0.3 * normalize(mainCoverage, currentCoverage, true) +
        0.07 * normalize(mainSmells, currentSmells, false) +
        0.07 * normalize(mainDuplication, currentDuplication, false) +
        0.06 * normalize(mainCheckstyle, currentCheckstyle, false);

    return Number(F.toFixed(4));
};

const hasStructuralMetrics = (metrics: Metrics): boolean => {
    return metrics.checkstyle_violations !== undefined &&
        metrics.spotbugs_total !== undefined &&
        metrics.spotbugs_total_classes !== undefined;
};

const requireStructuralMetrics = (metrics: Metrics): void => {
    if (!hasStructuralMetrics(metrics)) {
        throw new Error(
            "Structural fitness scoring requires checkstyle_violations, " +
            "spotbugs_total, and spotbugs_total_classes"
        );
    }
};

const readSloThresholds = (path: string) => parseSloThresholds(readFile(path));

const resolveRuntimeBaseline = async (
    config: Config,
    store: MetricsStore | undefined,
    currentRuntimeMetrics?: RuntimeMetrics
): Promise<RuntimeBaselineRecord | undefined> => {
    const explicitBaseline = readRuntimeArtifact(config.runtimeBaselineMetricsJsonPath);
    if (explicitBaseline) {
        return {
            provenance: explicitBaseline.provenance ?? {
                status: "manifest-missing",
            },
            runtimeMetrics: explicitBaseline.runtimeMetrics,
        };
    }

    if (!store || !currentRuntimeMetrics) {
        return undefined;
    }

    return store.findRuntimeBaseline(
        config.runtimeBaselineScenario,
        currentRuntimeMetrics.workload,
        currentRuntimeMetrics.source
    );
};

/* =======================
   SAVE DATA IN COSMOS DB
======================= */
const sanitizeBranchName = (name: string): string =>
    name.replaceAll(/[/\\#?]/g, '-');

class CosmosMetricsStore implements MetricsStore {
    private readonly container: ReturnType<ReturnType<CosmosClient["database"]>["container"]>;

    constructor(connectionString: string) {
        const client = new CosmosClient(connectionString);
        this.container = client.database("metrics").container("pipeline-runs");
    }

    async findStructuralBaseline(isMainBranch: boolean): Promise<Metrics | undefined> {
        const query = isMainBranch
            ? "SELECT * FROM c WHERE c.branch = 'main' ORDER BY c.timestamp DESC OFFSET 1 LIMIT 1"
            : "SELECT * FROM c WHERE c.branch = 'main' ORDER BY c.timestamp DESC OFFSET 0 LIMIT 1";
        const {resources} = await this.container.items.query(query).fetchAll();
        const snapshot = resources[0] as { metrics: Metrics } | undefined;
        return snapshot?.metrics;
    }

    async findRuntimeBaseline(
        scenario: string,
        workload: string,
        source: string
    ): Promise<RuntimeBaselineRecord | undefined> {
        const query =
            "SELECT * FROM c WHERE c.branch = 'main' " +
            "AND c.metrics.runtime_metrics.scenario = @scenario " +
            "AND c.metrics.runtime_metrics.workload = @workload " +
            "AND c.metrics.runtime_metrics.source = @source " +
            "ORDER BY c.timestamp DESC OFFSET 0 LIMIT 1";
        const {resources} = await this.container.items.query({
            query,
            parameters: [
                {name: "@scenario", value: scenario},
                {name: "@workload", value: workload},
                {name: "@source", value: source},
            ],
        }).fetchAll();
        const snapshot = resources[0] as MetricsDocument | undefined;
        if (!snapshot?.metrics.runtime_metrics) {
            return undefined;
        }
        return {
            provenance: {
                commitHash: snapshot.commitHash,
                documentId: snapshot.id,
                status: snapshot.id && snapshot.timestamp && snapshot.commitHash
                    ? "store-baseline-linked"
                    : "store-baseline-partial",
                timestamp: snapshot.timestamp,
            },
            runtimeMetrics: snapshot.metrics.runtime_metrics,
        };
    }

    async save(document: MetricsDocument): Promise<void> {
        const {resource} = await this.container.item(document.id, document.branch).read();

        if (resource) {
            console.log(`[metrics] already saved for commit ${document.commitHash}, skipping`);
            return;
        }

        await this.container.items.create(document);
    }
}

const createMetricsStore = (config: Config): MetricsStore | undefined => {
    if (!config.cosmosDbConnectionString) {
        return undefined;
    }

    return new CosmosMetricsStore(config.cosmosDbConnectionString);
};

const LOCAL_BASELINE_STORE: MetricsStore = {
    async findStructuralBaseline(): Promise<Metrics | undefined> {
        return undefined;
    },
    async findRuntimeBaseline(): Promise<RuntimeBaselineRecord | undefined> {
        return undefined;
    },
    async save(): Promise<void> {
        return undefined;
    },
};

const buildMetricsDocument = (
    config: Config,
    data: Metrics,
    fitnessScore: FitnessScore,
    runtimeFitnessResult: RuntimeFitnessResult,
    runtimeProvenance: RuntimeProvenanceMetadata | undefined,
    adaptiveFitnessResult: AdaptiveFitnessResult,
    paretoOptimizationResult: ParetoOptimizationResult,
    decisionUsefulnessResult: DecisionUsefulnessResult
): MetricsDocument => {
    const branch = sanitizeBranchName(config.branchName ?? "unknown");
    const id = `${branch}-${config.commitHash ?? "unknown"}`;

    return {
        id,
        timestamp: new Date().toISOString(),
        branch,
        commitHash: config.commitHash,
        pullRequestId: config.pullRequestId,
        metrics: data,
        fitnessScore,
        runtimeFitnessScore: runtimeFitnessResult.runtimeFitnessScore,
        runtimeFitnessScoreVersion: runtimeFitnessResult.runtimeFitnessScoreVersion,
        runtimeFitness: runtimeFitnessResult.runtimeFitness,
        runtimeProvenance,
        adaptiveFitnessScore: adaptiveFitnessResult.adaptiveFitnessScore,
        adaptiveFitnessScoreVersion: adaptiveFitnessResult.adaptiveFitnessScoreVersion,
        adaptiveFitness: adaptiveFitnessResult.adaptiveFitness,
        paretoOptimizationVersion: paretoOptimizationResult.paretoOptimizationVersion,
        paretoOptimization: paretoOptimizationResult.paretoOptimization,
        decisionUsefulnessVersion: decisionUsefulnessResult.decisionUsefulnessVersion,
        decisionUsefulness: decisionUsefulnessResult.decisionUsefulness,
    };
};

export const writeMetricsOutput = (path: string | undefined, document: MetricsDocument): void => {
    if (!path || path.trim() === "") {
        return;
    }

    fs.writeFileSync(path, `${JSON.stringify(document, null, 2)}\n`, "utf-8");
}

/* =======================
   PARSERS
======================= */
const parseCheckstyleViolations = (xmlContent: string): number => {
    return countMatches(xmlContent, REGEX_PATTERNS.CHECKSTYLE_ERROR);
};

const parseSpotbugsAttribute = (xmlContent: string, attr: string): number => {
    return extractNumber(
        xmlContent,
        REGEX_PATTERNS.SPOTBUGS_ATTR(attr),
        `SpotBugs: ${attr} not found`
    );
};

const parseSpotbugsTotalClasses = (htmlContent: string): number => {
    return extractNumber(
        htmlContent,
        REGEX_PATTERNS.SPOTBUGS_CLASSES,
        "SpotBugs HTML: total classes not found"
    );
};

const parseJacocoLineCoverage = (xmlContent: string): number => {
    const match = REGEX_PATTERNS.JACOCO_LINE.exec(xmlContent);
    if (!match) {
        throw new Error("JaCoCo LINE counter not found");
    }

    const missed = Number(match[1]);
    const covered = Number(match[2]);
    const total = missed + covered;

    return total === 0 ? 0 : (covered / total) * 100;
};

/* =======================
   READERS
======================= */
const readCheckstyleViolations = (path: string): number => {
    const xml = readFile(path);
    return parseCheckstyleViolations(xml);
};

const readSpotbugsTotalBugs = (path: string): number => {
    const xml = readFile(path);
    return parseSpotbugsAttribute(xml, "total_bugs");
};

const readSpotbugsTotalClasses = (xmlPath: string, htmlPath: string): number => {
    if (fileExists(htmlPath)) {
        const html = readFile(htmlPath);
        return parseSpotbugsTotalClasses(html);
    }

    const xml = readFile(xmlPath);
    return parseSpotbugsAttribute(xml, "total_classes");
};

const readJacocoLineCoverage = (path: string): number | undefined => {
    if (!fileExists(path)) {
        return undefined;
    }

    const xml = readFile(path);
    const coverage = parseJacocoLineCoverage(xml);
    return Number(coverage.toFixed(2));
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === "object" && value !== null && !Array.isArray(value);
};

const requireString = (value: unknown, field: string): string => {
    if (typeof value !== "string" || value.trim() === "") {
        throw new Error(`Runtime metrics: ${field} must be a non-empty string`);
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

const parseRuntimeMetricSummary = (
    rawSummary: unknown
): RuntimeMetricSummary => {
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

    return value.map((item, index) => requireString(item, `missing[${index}]`));
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
        scenario: requireString(parsed.scenario, "scenario"),
        workload: requireString(parsed.workload, "workload"),
        source: requireString(parsed.source, "source"),
        summary: parseRuntimeMetricSummary(parsed.summary),
        missing: parseMissingRuntimeFields(parsed.missing),
    };
};

export const readRuntimeMetrics = (path?: string): RuntimeMetrics | undefined => {
    if (!path || path.trim() === "") {
        return undefined;
    }

    return parseRuntimeMetrics(readFile(path));
};

export const readRuntimeMetricSet = (paths: readonly string[]): RuntimeMetrics[] =>
    paths.map((path) => parseRuntimeMetrics(readFile(path)));

const readRuntimeArtifact = (runtimeMetricsPath?: string): RuntimeArtifact | undefined => {
    if (!runtimeMetricsPath || runtimeMetricsPath.trim() === "") {
        return undefined;
    }
    const runtimeMetrics = parseRuntimeMetrics(readFile(runtimeMetricsPath));
    return {
        provenance: readAdjacentManifest(runtimeMetricsPath, runtimeMetrics),
        runtimeMetrics,
    };
};

const readRuntimeArtifactSet = (paths: readonly string[]): RuntimeArtifact[] =>
    paths.map((runtimeMetricsPath) => {
        const runtimeMetrics = parseRuntimeMetrics(readFile(runtimeMetricsPath));
        return {
            provenance: readAdjacentManifest(runtimeMetricsPath, runtimeMetrics),
            runtimeMetrics,
        };
    });

const readAdjacentManifest = (
    runtimeMetricsPath: string,
    runtimeMetrics: RuntimeMetrics
): RuntimeArtifactProvenance => {
    const manifestPath = path.join(path.dirname(runtimeMetricsPath), "runtime-summary-manifest.json");
    if (!fileExists(manifestPath)) {
        return {
            manifestPath,
            status: "manifest-missing",
        };
    }

    try {
        const manifest = JSON.parse(readFile(manifestPath)) as Record<string, unknown>;
        if (!manifestIdentityMatches(manifest, runtimeMetrics)) {
            return {
                manifestPath,
                status: "identity-mismatch",
            };
        }
        const manifestProvenance = isRecord(manifest.provenance) ? manifest.provenance : undefined;
        const runtimeEvidence = manifestProvenance && isRecord(manifestProvenance.runtime_evidence_vector)
            ? manifestProvenance.runtime_evidence_vector
            : undefined;
        const runtimeEvidenceVector = runtimeEvidence && isRecord(runtimeEvidence.summary)
            ? parseRuntimeMetricSummary(runtimeEvidence.summary)
            : undefined;
        const missing = runtimeEvidence
            ? parseMissingRuntimeFields(runtimeEvidence.missing)
            : undefined;
        const telemetryWindow = manifestProvenance && isRecord(manifestProvenance.telemetry_window)
            ? manifestProvenance.telemetry_window
            : undefined;
        return {
            commitHash: readStringField(manifest.git, "commit"),
            configurationHash: readStringField(manifestProvenance, "configuration_hash"),
            imageTag: readStringField(manifest.kubernetes, "image"),
            manifestPath,
            missing,
            runtimeEvidenceVector,
            status: manifest.collector_summary_written === true
                ? "manifest-linked"
                : "manifest-incomplete",
            telemetryWindow: {
                finishedAt: readStringField(telemetryWindow, "finished_at"),
                startedAt: readStringField(telemetryWindow, "started_at"),
            },
        };
    } catch {
        return {
            manifestPath,
            status: "manifest-malformed",
        };
    }
};

const manifestIdentityMatches = (
    manifest: Record<string, unknown>,
    runtimeMetrics: RuntimeMetrics
): boolean =>
    manifest.scenario === runtimeMetrics.scenario &&
    manifest.workload === runtimeMetrics.workload &&
    manifest.source === runtimeMetrics.source;

const readStringField = (value: unknown, field: string): string | undefined => {
    if (!isRecord(value)) {
        return undefined;
    }
    const candidate = value[field];
    return typeof candidate === "string" && candidate.trim() !== "" ? candidate : undefined;
};

const buildRuntimeProvenance = ({
    baseline,
    current,
    paretoArtifacts,
    scoringThresholdVersion,
}: {
    current?: RuntimeArtifactProvenance;
    baseline?: RuntimeArtifactProvenance;
    paretoArtifacts: RuntimeArtifact[];
    scoringThresholdVersion?: string;
}): RuntimeProvenanceMetadata | undefined => {
    const paretoCandidates = paretoArtifacts.reduce<Record<string, RuntimeArtifactProvenance>>(
        (acc, artifact) => {
            if (artifact.provenance) {
                acc[candidateId(artifact.runtimeMetrics)] = artifact.provenance;
            }
            return acc;
        },
        {}
    );
    if (!current && !baseline && Object.keys(paretoCandidates).length === 0 && !scoringThresholdVersion) {
        return undefined;
    }
    return {
        baseline,
        current,
        paretoCandidates: Object.keys(paretoCandidates).length > 0 ? paretoCandidates : undefined,
        scoring: scoringThresholdVersion ? {
            thresholdVersion: scoringThresholdVersion,
        } : undefined,
    };
};

const candidateId = (runtimeMetrics: RuntimeMetrics): string =>
    `${runtimeMetrics.scenario}:${runtimeMetrics.workload}:${runtimeMetrics.source}`;

const getCurrentScope = (config: Config): SonarScope => {
    const pr = config.pullRequestId;
    if (pr && pr.trim() !== "") return {kind: "pullRequest", id: pr.trim()};

    const b = config.branchName?.trim();
    return {kind: "branch", name: b && b !== "" ? b : "main"};
};

const validateMetrics = (metrics: Metrics): Result => {
    return {
        metrics,
        checkstyle_valid: true,
        spotbugs_valid: metrics.spotbugs_total_classes === undefined ||
            metrics.spotbugs_total_classes > 0,
    };
};

const extractMeasureValue = (m: SonarMeasure): string | undefined => {
    if (m.value != null) return m.value;
    const p1 = m.periods?.find(p => p.index === 1);
    return p1?.value;
};

const parseSonarMeasures = (data: SonarResponse): SonarMetricsMap => {
    const measures = data.component?.measures;
    if (!Array.isArray(measures)) {
        throw new TypeError("Unexpected SonarCloud response: component.measures missing");
    }

    const out: SonarMetricsMap = {};
    for (const m of measures) {
        const v = extractMeasureValue(m);
        if (v != null) out[m.metric] = v;
    }
    return out;
};

const fetchSonarCloudMetrics = async (scope: SonarScope, opts: {
    allowNotFound?: boolean
} = {}): Promise<SonarMetricsMap> => {
    const token = process.env.SONAR_TOKEN;
    if (!token) throw new Error("SONAR_TOKEN is not set");

    const basic = Buffer.from(`${token}:`).toString("base64");

    const metricKeys = [
        "alert_status",
        "bugs",
        "code_smells",
        "vulnerabilities",
        "security_hotspots",
        "violations",
        "blocker_violations",
        "critical_violations",
        "major_violations",
        "minor_violations",
        "info_violations",
        "confirmed_issues",
        "open_issues",
        "reopened_issues",
        "accepted_issues",
        "false_positive_issues",
        "sqale_rating",
        "reliability_rating",
        "coverage",
        "line_coverage",
        "branch_coverage",
        "lines_to_cover",
        "conditions_to_cover",
        "duplicated_lines",
        "duplicated_lines_density",
        "duplicated_blocks",
        "duplicated_files",
        "ncloc",
        "lines",
        "classes",
        "files",
        "functions",
        "complexity",
        "cognitive_complexity",
        "new_bugs",
        "new_code_smells",
        "new_vulnerabilities",
        "new_security_hotspots",
        "new_violations",
        "new_blocker_violations",
        "new_critical_violations",
        "new_major_violations",
        "new_minor_violations",
        "new_info_violations",
        "new_maintainability_rating",
        "new_reliability_rating",
        "new_coverage",
        "new_line_coverage",
        "new_branch_coverage",
        "new_lines_to_cover",
        "new_conditions_to_cover",
        "new_duplicated_lines",
        "new_duplicated_lines_density",
        "new_technical_debt",
        "new_lines",
    ].join(",");

    const componentKey = "Pan14ek_lined";

    const url = new URL("https://sonarcloud.io/api/measures/component");
    url.searchParams.set("metricKeys", metricKeys);
    url.searchParams.set("component", componentKey);

    if (scope.kind === "branch") {
        url.searchParams.set("branch", scope.name);
        console.log("[sonar] branch:", scope.name);
    } else {
        url.searchParams.set("pullRequest", scope.id);
        console.log("[sonar] pullRequest id:", scope.id);
    }

    console.log("[sonar] endpoint:", `${url.origin}${url.pathname}`);
    console.log("[sonar] component:", componentKey);
    console.log("[sonar] metricKeys count:", metricKeys.split(",").length);
    console.log("[sonar] query tail:", url.search.slice(-220));

    const response = await fetch(url, {
        headers: {Authorization: `Basic ${basic}`},
    });

    if (response.status === 404 && opts.allowNotFound) {
        const text = await response.text().catch(() => "");
        console.warn(`[sonar] 404 (allowed) scope=${scope.kind}. Body: ${text}`);
        return {};
    }

    if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(
            `SonarCloud HTTP ${response.status} ${response.statusText}. Body: ${text}`
        );
    }

    const data = (await response.json()) as SonarResponse;
    return parseSonarMeasures(data);
};

const toNumber = (v: unknown): number | null => {
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    if (typeof v === "string") {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    }
    return null;
};

const computeDiff = (base?: number, current?: number): MetricDiff | null => {
    if (base == null && current == null) return null;

    const delta = base != null && current != null ? current - base : undefined;

    return {base, current, delta};
};

const DIFF_KEYS = [
    "new_bugs",
    "new_code_smells",
    "new_vulnerabilities",
    "new_security_hotspots",
    "new_violations",
    "new_blocker_violations",
    "new_critical_violations",
    "new_major_violations",
    "new_minor_violations",
    "new_info_violations",
    "new_coverage",
    "new_line_coverage",
    "new_branch_coverage",
    "new_duplicated_lines",
    "new_duplicated_lines_density",
    "new_technical_debt",
    "new_lines",
    "new_lines_to_cover",
    "new_conditions_to_cover",
] as const;

type DiffKey = (typeof DIFF_KEYS)[number];
type MetricsDiffMapStrict = Partial<Record<DiffKey, MetricDiff>>;

const diffSelectedMetrics = (
    base: SonarMetricsMap,
    current: SonarMetricsMap
): MetricsDiffMapStrict => {
    const result: MetricsDiffMapStrict = {};

    for (const key of DIFF_KEYS) {
        const b = toNumber(base[key]) ?? undefined;
        const c = toNumber(current[key]) ?? undefined;

        const diff = computeDiff(b, c);
        if (diff) result[key] = diff;
    }

    return result;
};

/* =======================
   METRICS COLLECTION
======================= */
const collectMetrics = async (config: Config): Promise<Metrics> => {
    const jacocoCoverage = readJacocoLineCoverage(config.jacocoPath);
    const runtimeArtifact = readRuntimeArtifact(config.runtimeMetricsJsonPath);
    const runtimeMetrics = runtimeArtifact?.runtimeMetrics;

    const mainMetrics = await fetchSonarCloudMetrics({kind: "branch", name: "main"});

    const isMainBranch = config.branchName === "main";

    const currentMetrics = isMainBranch ?
        mainMetrics :
        await fetchSonarCloudMetrics(getCurrentScope(config), {allowNotFound: true});

    const metrics: Metrics = {
        checkstyle_violations: readCheckstyleViolations(config.checkstylePath),
        spotbugs_total: readSpotbugsTotalBugs(config.spotbugsXmlPath),
        spotbugs_total_classes: readSpotbugsTotalClasses(
            config.spotbugsXmlPath,
            config.spotbugsHtmlPath
        ),
        sonar_cloud_main_branch_metrics: mainMetrics,
        sonar_cloud_current_branch_metrics: currentMetrics,
        current_branch_name: config.branchName,
        sonar_diff: isMainBranch ? {} : diffSelectedMetrics(mainMetrics, currentMetrics)
    };

    if (jacocoCoverage !== undefined) {
        metrics.jacoco_line_coverage = jacocoCoverage;
    }

    if (runtimeMetrics !== undefined) {
        metrics.runtime_metrics = runtimeMetrics;
    }

    return metrics;
};

export const collectRuntimeOnlyMetrics = (config: Config): Metrics => {
    const runtimeMetrics = readRuntimeArtifact(config.runtimeMetricsJsonPath)?.runtimeMetrics;
    if (!runtimeMetrics) {
        throw new Error("RUNTIME_ONLY=true requires RUNTIME_METRICS_JSON");
    }

    return {
        runtime_metrics: runtimeMetrics,
    };
};

/* =======================
   MAIN
======================= */
const main = async (): Promise<void> => {
    try {
        const config: Config = getConfig();
        const currentRuntimeArtifact = readRuntimeArtifact(config.runtimeMetricsJsonPath);
        const metrics: Metrics = config.runtimeOnly
            ? collectRuntimeOnlyMetrics(config)
            : await collectMetrics(config);
        const result: Result = validateMetrics(metrics);
        const store = createMetricsStore(config);

        console.log(JSON.stringify(result, null, 2));

        if (!result.spotbugs_valid) {
            console.error(
                `ERROR: SpotBugs invalid (total_classes=0). ` +
                `Make sure spotbugsMain.html exists and contains "in N classes".`
            );
            process.exit(EXIT_CODES.SPOTBUGS_INVALID);
        }

        const runtimeBaseline = await resolveRuntimeBaseline(
            config,
            store,
            metrics.runtime_metrics
        );
        const runtimeBaselineMetrics = runtimeBaseline?.runtimeMetrics;
        const sloClassification = metrics.runtime_metrics
            ? classifyRuntimeMetrics(metrics.runtime_metrics, readSloThresholds(config.sloThresholdsJsonPath))
            : undefined;
        const runtimeFitnessResult = computeRuntimeFitness(
            metrics.runtime_metrics,
            runtimeBaselineMetrics,
            sloClassification
        );

        if (!config.runtimeOnly) {
            requireStructuralMetrics(metrics);
        }

        const fitnessScore = config.runtimeOnly
            ? null
            : await computeFitnessFunction(store ?? LOCAL_BASELINE_STORE, config, metrics);
        const adaptiveFitnessResult = computeAdaptiveFitness(
            fitnessScore,
            metrics.runtime_metrics,
            runtimeFitnessResult.runtimeFitness,
            config.adaptiveFitnessContext
        );
        const paretoArtifacts = readRuntimeArtifactSet(config.paretoRuntimeMetricsJsonPaths);
        const paretoOptimizationResult = computeParetoOptimization(
            paretoArtifacts.map((artifact) => artifact.runtimeMetrics)
        );
        const decisionUsefulnessResult = computeDecisionUsefulness(paretoOptimizationResult);
        const runtimeProvenance = buildRuntimeProvenance({
            current: currentRuntimeArtifact?.provenance,
            baseline: runtimeBaseline?.provenance,
            paretoArtifacts,
            scoringThresholdVersion: sloClassification?.thresholdVersion,
        });
        const document = buildMetricsDocument(
            config,
            metrics,
            fitnessScore,
            runtimeFitnessResult,
            runtimeProvenance,
            adaptiveFitnessResult,
            paretoOptimizationResult,
            decisionUsefulnessResult
        );

        console.log(`[fitness] F = ${fitnessScore}`);
        console.log(`[fitness] runtime F = ${runtimeFitnessResult.runtimeFitnessScore}`);
        console.log(`[fitness] adaptive F = ${adaptiveFitnessResult.adaptiveFitnessScore}`);
        console.log(
            `[fitness] pareto candidates = ` +
            `${paretoOptimizationResult.paretoOptimization?.candidates.length ?? 0}`
        );
        console.log(
            `[fitness] decision usefulness = ` +
            `${decisionUsefulnessResult.decisionUsefulness.usefulnessClassification}`
        );
        writeMetricsOutput(config.metricsOutputJsonPath, document);

        if (!store) {
            console.log(`We cannot save metrics to the database. Missing COSMOS_DB_CONNECTION_STRING environment variable.`);
            return;
        }

        await store.save(document);
    } catch (error) {
        console.error("Fatal error:", error instanceof Error ? error.message : error);
        process.exit(1);
    }
};

if (require.main === module) {
    void main();
}
