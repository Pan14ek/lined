import fs from "node:fs";
import {CosmosClient} from "@azure/cosmos";

/* =======================
   TYPES
======================= */
type Metrics = {
    checkstyle_violations: number;
    spotbugs_total: number;
    spotbugs_total_classes: number;
    jacoco_line_coverage?: number;
    sonar_cloud_main_branch_metrics?: SonarMetricsMap;
    sonar_cloud_current_branch_metrics?: SonarMetricsMap;
    current_branch_name?: string;
    sonar_diff?: MetricsDiffMap;
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

const getConfig = (): Config => {
    return {
        checkstylePath: process.env.CHECKSTYLE_XML ?? DEFAULT_PATHS.CHECKSTYLE,
        spotbugsXmlPath: process.env.SPOTBUGS_XML ?? DEFAULT_PATHS.SPOTBUGS_XML,
        spotbugsHtmlPath: process.env.SPOTBUGS_HTML ?? DEFAULT_PATHS.SPOTBUGS_HTML,
        jacocoPath: process.env.JACOCO_XML ?? DEFAULT_PATHS.JACOCO,
        branchName: process.env.BRANCH_NAME,
        pullRequestId: process.env.PR_NUMBER,
        commitHash: process.env.GITHUB_SHA,
        cosmosDbConnectionString: process.env.COSMOS_DB_CONNECTION_STRING,
    };
};

/* =======================
   SAVE DATA IN COSMOS DB
======================= */
const saveMetrics = async (config: Config, data: Metrics): Promise<void> => {
    if (!config.cosmosDbConnectionString) {
        console.log(`We cannot save metrics to the database. Missing COSMOS_DB_CONNECTION_STRING environment variable.`);
        return;
    }

    const client = new CosmosClient(config.cosmosDbConnectionString);

    const id = `${config.branchName ?? "unknown"}-${config.commitHash}`;

    const container = client.database("metrics").container("pipeline-runs");

    const {resource} = await container.item(id, config.branchName).read()

    if (resource) {
        console.log(`[metrics] already saved for commit ${config.commitHash}, skipping`);
        return;
    }

    await container.items.create({
        id: id,
        timestamp: new Date().toISOString(),
        branch: config.branchName,
        commitHash: process.env.GITHUB_SHA,
        pullRequestId: config.pullRequestId,
        metrics: data
    });
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
        spotbugs_valid: metrics.spotbugs_total_classes > 0,
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

    const mainMetrics = await fetchSonarCloudMetrics({kind: "branch", name: "main"});

    const currentScope = getCurrentScope(config);

    const currentMetrics = await fetchSonarCloudMetrics(currentScope, {allowNotFound: true});

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
        sonar_diff: diffSelectedMetrics(mainMetrics, currentMetrics)
    };

    if (jacocoCoverage !== undefined) {
        metrics.jacoco_line_coverage = jacocoCoverage;
    }

    return metrics;
};

/* =======================
   MAIN
======================= */
const main = async (): Promise<void> => {
    try {
        const config: Config = getConfig();
        const metrics: Metrics = await collectMetrics(config);
        const result: Result = validateMetrics(metrics);

        console.log(JSON.stringify(result, null, 2));

        if (!result.spotbugs_valid) {
            console.error(
                `ERROR: SpotBugs invalid (total_classes=0). ` +
                `Make sure spotbugsMain.html exists and contains "in N classes".`
            );
            process.exit(EXIT_CODES.SPOTBUGS_INVALID);
        }

       // await saveMetrics(config, metrics);
    } catch (error) {
        console.error("Fatal error:", error instanceof Error ? error.message : error);
        process.exit(1);
    }
};

void main();