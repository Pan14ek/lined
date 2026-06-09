import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  buildExperimentResultsReport,
  parseReportArgs,
  writeExperimentResultsReport,
} from './experiment-results-report.mjs';

const runtimeSummary = (scenario, overrides = {}) => ({
  schema_version: 1,
  scenario,
  workload: 'baseline',
  source: 'local-kind',
  summary: {
    latency_p95_ms: 200,
    latency_p99_ms: 420,
    error_rate: 0,
    throughput_rps: 35,
    restart_count: 0,
    ...overrides.summary,
  },
  missing: overrides.missing ?? [
    'availability',
    'cpu_utilization',
    'memory_utilization',
  ],
});

const metricsDocument = (scenario = 'replicas-2') => ({
  fitnessScore: 0.12,
  runtimeFitnessScore: 0.24,
  runtimeFitnessScoreVersion: 'runtime-aware-v1',
  adaptiveFitnessScore: 0.31,
  adaptiveFitnessScoreVersion: 'adaptive-weighted-v1',
  runtimeFitness: {
    current: {
      scenario,
      workload: 'baseline',
      source: 'local-kind',
    },
  },
  paretoOptimization: {
    activeObjectives: ['latency_p95_ms', 'error_rate'],
    candidates: [{
      candidateId: 'fixed-medium:baseline:local-kind',
      crowdingDistance: 'Infinity',
      rank: 1,
    }, {
      candidateId: 'replicas-2:baseline:local-kind',
      crowdingDistance: 1,
      rank: 1,
    }],
    omittedObjectives: ['availability'],
    selectedCandidateIds: [
      'fixed-medium:baseline:local-kind',
      'replicas-2:baseline:local-kind',
    ],
  },
  decisionUsefulness: {
    comparatorOmittedObjectives: ['availability'],
    candidates: [{
      betterThanScalarTop: ['cpu_utilization'],
      candidateId: 'replicas-2:baseline:local-kind',
      fixedScalarRank: 2,
      paretoRank: 1,
      rationale: 'Improves cpu_utilization while sacrificing latency_p95_ms.',
      worseThanScalarTop: ['latency_p95_ms'],
    }],
    fixedScalarTopCandidateId: 'fixed-medium:baseline:local-kind',
    reasonCodes: [],
    usefulnessClassification: 'multiple-tradeoff-alternatives',
  },
});

describe('parseReportArgs', () => {
  it('accepts repeated metrics, summaries, and manifests', (t) => {
    t.plan(4);
    const options = parseReportArgs([
      '--metrics-json',
      'metrics-a.json',
      '--metrics-json',
      'metrics-b.json',
      '--runtime-summary',
      'runtime-a.json',
      '--runtime-manifest',
      'manifest-a.json',
      '--output-dir',
      'out',
    ]);

    t.assert.deepEqual(options.metricsJson, ['metrics-a.json', 'metrics-b.json']);
    t.assert.deepEqual(options.runtimeSummary, ['runtime-a.json']);
    t.assert.deepEqual(options.runtimeManifest, ['manifest-a.json']);
    t.assert.equal(options.outputDir, 'out');
  });

  it('rejects an empty evidence set', (t) => {
    t.plan(1);
    t.assert.throws(
      () => parseReportArgs(['--output-dir', 'out']),
      /At least one evidence artifact is required/
    );
  });
});

describe('buildExperimentResultsReport', () => {
  it('keeps score lanes separate and renders Results, Discussion, and Limitations', (t) => {
    t.plan(8);
    const report = buildExperimentResultsReport({
      metricsDocuments: [{
        sourcePath: 'metrics.json',
        value: metricsDocument(),
      }],
      runtimeManifests: [],
      runtimeSummaries: [
        { sourcePath: 'fixed-medium.json', value: runtimeSummary('fixed-medium') },
        { sourcePath: 'replicas-2.json', value: runtimeSummary('replicas-2') },
        { sourcePath: 'hpa-cpu.json', value: runtimeSummary('hpa-cpu') },
      ],
    });

    t.assert.equal(report.tables.scoreLanes.length, 3);
    t.assert.equal(report.tables.runtimeSummaries.length, 3);
    t.assert.equal(report.tables.paretoCandidates.length, 2);
    t.assert.equal(report.tables.decisionUsefulness.length, 1);
    t.assert.equal(report.canonicalComparison.status, 'available');
    t.assert.match(report.markdown, /## Results/);
    t.assert.match(report.markdown, /## Discussion/);
    t.assert.match(report.markdown, /## Limitations \/ Threats to Validity/);
  });

  it('excludes duplicate and manifest-only evidence with explicit reasons', (t) => {
    t.plan(5);
    const report = buildExperimentResultsReport({
      metricsDocuments: [],
      runtimeManifests: [{
        sourcePath: 'failed-manifest.json',
        value: {
          collector_summary_written: false,
          scenario: 'hpa-cpu',
          source: 'local-kind',
          workload: 'baseline',
        },
      }],
      runtimeSummaries: [
        { sourcePath: 'replicas-2-a.json', value: runtimeSummary('replicas-2') },
        { sourcePath: 'replicas-2-b.json', value: runtimeSummary('replicas-2') },
      ],
    });
    const excluded = report.evidence.filter((entry) => entry.inclusionStatus === 'excluded');

    t.assert.equal(report.tables.runtimeSummaries.length, 1);
    t.assert.equal(excluded.length, 2);
    t.assert.equal(excluded[0].exclusionReason, 'duplicate-candidate-identity');
    t.assert.equal(excluded[1].exclusionReason, 'manifest-only-failed-or-incomplete-run');
    t.assert.match(report.markdown, /Excluded runtime-manifest failed-manifest.json/);
  });

  it('joins successful manifest fixture provenance to the matching runtime summary', (t) => {
    t.plan(5);
    const report = buildExperimentResultsReport({
      metricsDocuments: [],
      runtimeManifests: [{
        sourcePath: 'replicas-2-manifest.json',
        value: {
          collector_summary_written: true,
          fixture_profile: {
            name: 'comparison-baseline',
          },
          scenario: 'replicas-2',
          source: 'local-kind',
          workload: 'baseline',
        },
      }],
      runtimeSummaries: [
        { sourcePath: 'replicas-2-summary.json', value: runtimeSummary('replicas-2') },
      ],
    });
    const runtimeEvidence = report.evidence.find((entry) => entry.artifactType === 'runtime-summary');
    const manifestEvidence = report.evidence.find((entry) => entry.artifactType === 'runtime-manifest');
    const row = report.tables.runtimeSummaries[0];

    t.assert.equal(row.fixtureProfile, 'comparison-baseline');
    t.assert.equal(row.manifestPath, 'replicas-2-manifest.json');
    t.assert.equal(runtimeEvidence.fixtureProfile, 'comparison-baseline');
    t.assert.equal(runtimeEvidence.manifestPath, 'replicas-2-manifest.json');
    t.assert.equal(manifestEvidence.inclusionStatus, 'excluded');
  });

  it('does not join failed or duplicate manifest provenance to runtime summaries', (t) => {
    t.plan(7);
    const report = buildExperimentResultsReport({
      metricsDocuments: [],
      runtimeManifests: [{
        sourcePath: 'failed-manifest.json',
        value: {
          collector_summary_written: false,
          fixture_profile: {
            name: 'failed-profile',
          },
          scenario: 'replicas-2',
          source: 'local-kind',
          workload: 'baseline',
        },
      }, {
        sourcePath: 'hpa-manifest-a.json',
        value: {
          collector_summary_written: true,
          fixture_profile: {
            name: 'profile-a',
          },
          scenario: 'hpa-cpu',
          source: 'local-kind',
          workload: 'baseline',
        },
      }, {
        sourcePath: 'hpa-manifest-b.json',
        value: {
          collector_summary_written: true,
          fixture_profile: {
            name: 'profile-b',
          },
          scenario: 'hpa-cpu',
          source: 'local-kind',
          workload: 'baseline',
        },
      }],
      runtimeSummaries: [
        { sourcePath: 'replicas-2-summary.json', value: runtimeSummary('replicas-2') },
        { sourcePath: 'hpa-summary.json', value: runtimeSummary('hpa-cpu') },
      ],
    });
    const replicasRow = report.tables.runtimeSummaries
      .find((row) => row.candidateId === 'replicas-2:baseline:local-kind');
    const hpaRow = report.tables.runtimeSummaries
      .find((row) => row.candidateId === 'hpa-cpu:baseline:local-kind');
    const manifestReasons = report.evidence
      .filter((entry) => entry.artifactType === 'runtime-manifest')
      .map((entry) => entry.exclusionReason);

    t.assert.equal(replicasRow.fixtureProfile, '');
    t.assert.equal(replicasRow.manifestPath, '');
    t.assert.equal(hpaRow.fixtureProfile, '');
    t.assert.equal(hpaRow.manifestPath, '');
    t.assert.equal(manifestReasons.includes('manifest-only-failed-or-incomplete-run'), true);
    t.assert.equal(manifestReasons.filter((reason) => reason === 'duplicate-manifest-identity').length, 2);
    t.assert.equal(report.tables.runtimeSummaries.length, 2);
  });

  it('does not infer availability from error rate', (t) => {
    t.plan(3);
    const report = buildExperimentResultsReport({
      metricsDocuments: [],
      runtimeManifests: [],
      runtimeSummaries: [
        {
          sourcePath: 'runtime.json',
          value: runtimeSummary('fixed-medium', {
            missing: [],
            summary: {
              error_rate: 0,
            },
          }),
        },
      ],
    });
    const row = report.tables.runtimeSummaries[0];

    t.assert.equal(row.error_rate, '0');
    t.assert.equal(row.availability, '');
    t.assert.deepEqual(report.limitations.missingRuntimeMetrics, ['availability']);
  });

  it('renders canonical comparison failures in markdown limitations', (t) => {
    t.plan(2);
    const report = buildExperimentResultsReport({
      metricsDocuments: [],
      runtimeManifests: [],
      runtimeSummaries: [
        { sourcePath: 'fixed-medium.json', value: runtimeSummary('fixed-medium') },
      ],
    });

    t.assert.equal(report.canonicalComparison.status, 'incomplete');
    t.assert.match(report.markdown, /Canonical comparison status: incomplete \(missing-replicas-2, missing-hpa-cpu\)/);
  });
});

describe('writeExperimentResultsReport', () => {
  it('writes markdown, csv, svg, and provenance index outputs', (t) => {
    t.plan(6);
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lined-results-report-'));
    const input = path.join(directory, 'input');
    const output = path.join(directory, 'output');
    fs.mkdirSync(input);
    const metricsPath = path.join(input, 'metrics.json');
    const summaryPath = path.join(input, 'runtime-summary.json');
    fs.writeFileSync(metricsPath, JSON.stringify(metricsDocument()), 'utf-8');
    fs.writeFileSync(summaryPath, JSON.stringify(runtimeSummary('replicas-2')), 'utf-8');

    try {
      const result = writeExperimentResultsReport({
        metricsJson: [metricsPath],
        outputDir: output,
        runtimeManifest: [],
        runtimeSummary: [summaryPath],
      });
      const reportPath = path.join(output, 'results-report.json');
      const markdown = fs.readFileSync(path.join(output, 'results-summary.md'), 'utf-8');
      const csv = fs.readFileSync(path.join(output, 'score-lanes.csv'), 'utf-8');
      const svg = fs.readFileSync(path.join(output, 'score-lanes.svg'), 'utf-8');
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

      t.assert.equal(fs.existsSync(reportPath), true);
      t.assert.equal(result.outputs.includes(reportPath), true);
      t.assert.match(markdown, /# Experiment Results Summary/);
      t.assert.match(csv, /fitnessScore/);
      t.assert.match(svg, /<svg/);
      t.assert.equal(report.outputs.includes(reportPath), true);
    } finally {
      fs.rmSync(directory, { force: true, recursive: true });
    }
  });
});
