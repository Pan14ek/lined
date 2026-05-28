import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {describe, it} from "node:test";

import {parseRuntimeMetrics, readRuntimeMetrics} from "./collectMetrics";

const validRuntimeMetricsJson = JSON.stringify({
    schema_version: 1,
    scenario: "fixed-medium",
    workload: "baseline",
    source: "local-kind",
    summary: {
        latency_p95_ms: 250.5,
        latency_p99_ms: 550.25,
        error_rate: 0.002,
        throughput_rps: 42.1,
        availability: 1,
        restart_count: 0,
        cpu_utilization: 0.62,
        memory_utilization: 0.71,
        hpa_desired_replicas: 2,
        hpa_current_replicas: 2,
    },
    missing: ["process_cpu_usage"],
});

describe("parseRuntimeMetrics", () => {
    it("parses a valid summarized runtime metrics document", () => {
        const result = parseRuntimeMetrics(validRuntimeMetricsJson);

        assert.deepEqual(result, {
            schema_version: 1,
            scenario: "fixed-medium",
            workload: "baseline",
            source: "local-kind",
            summary: {
                latency_p95_ms: 250.5,
                latency_p99_ms: 550.25,
                error_rate: 0.002,
                throughput_rps: 42.1,
                availability: 1,
                restart_count: 0,
                cpu_utilization: 0.62,
                memory_utilization: 0.71,
                hpa_desired_replicas: 2,
                hpa_current_replicas: 2,
            },
            missing: ["process_cpu_usage"],
        });
    });

    it("accepts a summary with omitted optional metric fields", () => {
        const result = parseRuntimeMetrics(JSON.stringify({
            schema_version: 1,
            scenario: "fixed-small",
            workload: "smoke",
            source: "local-kind",
            summary: {
                error_rate: 0,
            },
        }));

        assert.deepEqual(result, {
            schema_version: 1,
            scenario: "fixed-small",
            workload: "smoke",
            source: "local-kind",
            summary: {
                error_rate: 0,
            },
            missing: undefined,
        });
    });

    it("rejects unsupported schema versions", () => {
        assert.throws(
            () => parseRuntimeMetrics(JSON.stringify({
                schema_version: 2,
                scenario: "fixed-medium",
                workload: "baseline",
                source: "local-kind",
                summary: {},
            })),
            /schema_version must be 1/
        );
    });

    it("rejects missing or blank required string fields", () => {
        assert.throws(
            () => parseRuntimeMetrics(JSON.stringify({
                schema_version: 1,
                scenario: " ",
                workload: "baseline",
                source: "local-kind",
                summary: {},
            })),
            /scenario must be a non-empty string/
        );
    });

    it("rejects non-numeric summary fields", () => {
        assert.throws(
            () => parseRuntimeMetrics(JSON.stringify({
                schema_version: 1,
                scenario: "fixed-medium",
                workload: "baseline",
                source: "local-kind",
                summary: {
                    latency_p95_ms: "250",
                },
            })),
            /summary\.latency_p95_ms must be a finite number/
        );
    });

    it("rejects negative count and duration fields", () => {
        assert.throws(
            () => parseRuntimeMetrics(JSON.stringify({
                schema_version: 1,
                scenario: "fixed-medium",
                workload: "baseline",
                source: "local-kind",
                summary: {
                    restart_count: -1,
                },
            })),
            /summary\.restart_count must be >= 0/
        );
    });

    it("rejects ratio fields greater than one", () => {
        assert.throws(
            () => parseRuntimeMetrics(JSON.stringify({
                schema_version: 1,
                scenario: "fixed-medium",
                workload: "baseline",
                source: "local-kind",
                summary: {
                    error_rate: 1.1,
                },
            })),
            /summary\.error_rate must be <= 1/
        );
    });

    it("rejects non-string missing field names", () => {
        assert.throws(
            () => parseRuntimeMetrics(JSON.stringify({
                schema_version: 1,
                scenario: "fixed-medium",
                workload: "baseline",
                source: "local-kind",
                summary: {},
                missing: ["availability", 42],
            })),
            /missing\[1\] must be a non-empty string/
        );
    });
});

describe("readRuntimeMetrics", () => {
    it("returns undefined when no path is provided", () => {
        assert.equal(readRuntimeMetrics(), undefined);
        assert.equal(readRuntimeMetrics(" "), undefined);
    });

    it("reads and parses a runtime metrics JSON file", () => {
        const directory = fs.mkdtempSync(path.join(os.tmpdir(), "lined-runtime-"));
        const file = path.join(directory, "runtime-summary.json");

        try {
            fs.writeFileSync(file, validRuntimeMetricsJson, "utf-8");

            const result = readRuntimeMetrics(file);

            assert.equal(result?.schema_version, 1);
            assert.equal(result?.scenario, "fixed-medium");
            assert.equal(result?.summary.latency_p95_ms, 250.5);
        } finally {
            fs.rmSync(directory, {recursive: true, force: true});
        }
    });
});
