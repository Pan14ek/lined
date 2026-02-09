import { readFileSync, existsSync } from "fs";

/* =======================
   TYPES
======================= */
type Metrics = {
    checkstyle_violations: number;
    spotbugs_total: number;
    spotbugs_total_classes: number;
    jacoco_line_coverage?: number;
};

type ValidationResult = {
    metrics: Metrics;
    spotbugs_valid: boolean;
    checkstyle_valid: boolean;
};

/* =======================
   CHECKSTYLE
======================= */
function readCheckstyleViolations(path: string): number {
    const xml = readFileSync(path, "utf-8");
    const matches = xml.match(/<error\b/g);
    return matches ? matches.length : 0;
}

/* =======================
   SPOTBUGS
======================= */
function readSpotbugsAttr(path: string, attr: string): number {
    const xml = readFileSync(path, "utf-8");
    const m = xml.match(new RegExp(`${attr}="(\\d+)"`));
    if (!m) throw new Error(`SpotBugs: ${attr} not found`);
    return Number(m[1]);
}

/* =======================
   JACOCO
======================= */
function readJacocoLineCoverage(path: string): number {
    const xml = readFileSync(path, "utf-8");

    const regex = /<counter type="LINE" missed="(\d+)" covered="(\d+)"/g;

    let match: RegExpExecArray | null;
    let lastMissed = 0;
    let lastCovered = 0;
    let found = false;

    while ((match = regex.exec(xml)) !== null) {
        lastMissed = Number(match[1]);
        lastCovered = Number(match[2]);
        found = true;
    }

    if (!found) {
        throw new Error("JaCoCo LINE counter not found");
    }

    const total = lastMissed + lastCovered;
    return total === 0 ? 0 : (lastCovered / total) * 100;
}


/* =======================
   MAIN
======================= */
function main() {
    const checkstylePath = process.env.CHECKSTYLE_XML ?? "build/reports/checkstyle/main.xml";
    const spotbugsPath = process.env.SPOTBUGS_XML ?? "build/reports/spotbugs/main.xml";
    const jacocoPath = process.env.JACOCO_XML ?? "build/reports/jacoco/test/jacocoTestReport.xml";

    const metrics: Metrics = {
        checkstyle_violations: existsSync(checkstylePath) ? readCheckstyleViolations(checkstylePath) : 0,
        spotbugs_total: readSpotbugsAttr(spotbugsPath, "total_bugs"),
        spotbugs_total_classes: readSpotbugsAttr(spotbugsPath, "total_classes"),
    };

    if (existsSync(jacocoPath)) {
        metrics.jacoco_line_coverage = Number(readJacocoLineCoverage(jacocoPath).toFixed(2));
    }

    const result: ValidationResult = {
        metrics,
        checkstyle_valid: true,
        spotbugs_valid: metrics.spotbugs_total_classes > 0,
    };

    console.log(JSON.stringify(result, null, 2));

    if (!result.spotbugs_valid) {
        console.error("ERROR: SpotBugs analysis is invalid (total_classes = 0). Ensure spotbugsMain ran and main.xml is generated.");
        process.exit(2);
    }
}

main();
