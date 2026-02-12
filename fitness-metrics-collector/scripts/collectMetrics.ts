import fs from "fs";

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

/* =======================
   HELPERS
======================= */
function readFile(path: string): string {
    if (!fs.existsSync(path)) {
        throw new Error(`File not found: ${path}`);
    }
    return fs.readFileSync(path, "utf-8");
}

/* =======================
   CHECKSTYLE
======================= */
function readCheckstyleViolations(path: string): number {
    const xml = readFile(path);
    const matches = xml.match(/<error\b/g);
    return matches ? matches.length : 0;
}

/* =======================
   SPOTBUGS
======================= */
function readSpotbugsAttr(path: string, attr: string): number {
    const xml = readFile(path);
    const re = new RegExp(`${attr}="(\\d+)"`);
    const m = xml.match(re);
    if (!m) throw new Error(`SpotBugs: ${attr} not found in ${path}`);
    return Number(m[1]);
}

/* =======================
   JACOCO
======================= */
function readJacocoLineCoverage(path: string): number {
    const xml = readFile(path);
    const m = xml.match(/<counter type="LINE" missed="(\d+)" covered="(\d+)"/);
    if (!m) throw new Error(`JaCoCo LINE counter not found in ${path}`);

    const missed = Number(m[1]);
    const covered = Number(m[2]);
    const total = missed + covered;

    return total === 0 ? 0 : (covered / total) * 100;
}

/* =======================
   MAIN
======================= */
function main() {
    // IMPORTANT: read spotbugsMain report (not test)
    const checkstylePath =
        process.env.CHECKSTYLE_XML ?? "../backend/lined/build/reports/checkstyle/main.xml";

    const spotbugsPath =
        process.env.SPOTBUGS_XML ?? "../backend/lined/build/reports/spotbugs/spotbugsMain.xml";

    const jacocoPath =
        process.env.JACOCO_XML ?? "../backend/lined/build/reports/jacoco/test/jacocoTestReport.xml";

    const metrics: Metrics = {
        checkstyle_violations: readCheckstyleViolations(checkstylePath),
        spotbugs_total: readSpotbugsAttr(spotbugsPath, "total_bugs"),
        spotbugs_total_classes: readSpotbugsAttr(spotbugsPath, "total_classes")
    };

    if (fs.existsSync(jacocoPath)) {
        metrics.jacoco_line_coverage = Number(readJacocoLineCoverage(jacocoPath).toFixed(2));
    }

    const result: Result = {
        metrics,
        checkstyle_valid: true,
        spotbugs_valid: metrics.spotbugs_total_classes > 0
    };

    console.log(JSON.stringify(result, null, 2));

    if (!result.spotbugs_valid) {
        console.error(
            `ERROR: SpotBugs invalid (total_classes=0). ` +
            `Check that spotbugsMain report is used and not overwritten by spotbugsTest.`
        );
        process.exit(2);
    }
}

main();
