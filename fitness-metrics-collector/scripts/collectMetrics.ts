import fs from "node:fs";

/* =======================
   TYPES
======================= */
type Metrics = {
    checkstyle_violations: number;
    spotbugs_total: number;
    spotbugs_total_classes: number;
    jacoco_line_coverage?: number;
};

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
    };
};

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

/* =======================
   METRICS COLLECTION
======================= */
const collectMetrics = (config: Config): Metrics => {
    const metrics: Metrics = {
        checkstyle_violations: readCheckstyleViolations(config.checkstylePath),
        spotbugs_total: readSpotbugsTotalBugs(config.spotbugsXmlPath),
        spotbugs_total_classes: readSpotbugsTotalClasses(
            config.spotbugsXmlPath,
            config.spotbugsHtmlPath
        ),
    };

    const jacocoCoverage = readJacocoLineCoverage(config.jacocoPath);
    if (jacocoCoverage !== undefined) {
        metrics.jacoco_line_coverage = jacocoCoverage;
    }

    return metrics;
};

const validateMetrics = (metrics: Metrics): Result => {
    return {
        metrics,
        checkstyle_valid: true,
        spotbugs_valid: metrics.spotbugs_total_classes > 0,
    };
};

/* =======================
   MAIN
======================= */
const main = (): void => {
    try {
        const config = getConfig();
        const metrics = collectMetrics(config);
        const result = validateMetrics(metrics);

        console.log(JSON.stringify(result, null, 2));

        if (!result.spotbugs_valid) {
            console.error(
                `ERROR: SpotBugs invalid (total_classes=0). ` +
                `Make sure spotbugsMain.html exists and contains "in N classes".`
            );
            process.exit(EXIT_CODES.SPOTBUGS_INVALID);
        }
    } catch (error) {
        console.error("Fatal error:", error instanceof Error ? error.message : error);
        process.exit(1);
    }
};

main();