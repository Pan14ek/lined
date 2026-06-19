import childProcess from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  HARNESS_WORKFLOW_VERSION,
  SUBMISSION_WORKFLOW_VERSION,
  buildAgentEvaluationReport,
  parseHarnessArgs,
  reportOutputFile,
  writeAgentEvaluationReport,
} from './agent-evaluation-harness.mjs';

const CASES_PATH = path.resolve('load-tests/runtime-scenarios/agent-evaluation-cases-v1.json');
const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf-8'));
const CASES_ARTIFACT = readJson(CASES_PATH);

const ruleSuggestionSubmission = () => ({
  schema_version: 1,
  workflow_version: SUBMISSION_WORKFLOW_VERSION,
  case_id: 'rule-suggestions-fixed-medium-baseline',
  output_type: 'rule-suggestions',
  loaded_sources: [
    caseSource('rule-suggestions-fixed-medium-baseline', 'repo-llm-support-service'),
    caseSource('rule-suggestions-fixed-medium-baseline', 'notion-research-workflow'),
    caseSource('rule-suggestions-fixed-medium-baseline', 'runtime-summary-fixed-medium'),
  ],
  output: {
    summary: 'These advisory candidate rules stay bounded and require human review before any promotion.',
    candidate_rules: [
      {
        name: 'Latency P95 Fixed Medium',
        classification: 'objective-with-constraint',
        metric: 'latency_p95_ms',
        direction: 'minimize',
        constraint: 'latency_p95_ms <= 1000',
        rationale: 'Keeps stable baseline responsiveness explicit.',
        scenario_scope: ['fixed-medium'],
        source_ids: ['repo-llm-support-service', 'runtime-summary-fixed-medium'],
        requires_human_approval: true,
      },
      {
        name: 'Error Rate Fixed Medium',
        classification: 'hard-constraint',
        metric: 'error_rate',
        direction: 'minimize',
        constraint: 'error_rate <= 0.01',
        rationale: 'Preserves validity of the baseline comparison run.',
        scenario_scope: ['fixed-medium'],
        source_ids: ['runtime-summary-fixed-medium'],
        requires_human_approval: true,
      },
    ],
  },
});

const researchSummarySubmission = () => ({
  schema_version: 1,
  workflow_version: SUBMISSION_WORKFLOW_VERSION,
  case_id: 'research-summary-runtime-evidence',
  output_type: 'research-summary',
  loaded_sources: [
    caseSource('research-summary-runtime-evidence', 'repo-runtime-quality-catalog'),
    caseSource('research-summary-runtime-evidence', 'notion-experiment-design'),
    caseSource('research-summary-runtime-evidence', 'runtime-summary-fixed-medium'),
  ],
  output: {
    summary: 'The fixed-medium latency and error rate evidence stays grounded in the collector-ready runtime summary for the local kind baseline.',
    key_claims: [
      'The scenario primarily reflects performance efficiency under the current runtime evidence contract.',
      'The collector-ready runtime summary remains the sanitized artifact used for comparison.',
    ],
    limitations: [
      'The evidence comes from local kind and is not production-equivalent.',
    ],
    next_actions: [
      'Refresh the Notion snapshot when the live experiment page changes.',
      'Keep reviewer validation attached before citing this summary in experiment work.',
    ],
    referenced_source_ids: ['notion-experiment-design', 'runtime-summary-fixed-medium'],
    uncertainty_notes: [
      'This snapshot may be stale if the live Notion page changed after the fixture refresh.',
      'The summary is based on a local snapshot rather than live Notion retrieval.',
    ],
  },
});

describe('parseHarnessArgs', () => {
  it('accepts the required options', (t) => {
    const options = parseHarnessArgs([
      '--cases-json',
      'cases.json',
      '--submission-json',
      'submission.json',
      '--output-dir',
      'out',
    ]);

    t.assert.equal(options.casesJson, 'cases.json');
    t.assert.equal(options.submissionJson, 'submission.json');
    t.assert.equal(options.outputDir, 'out');
  });
});

describe('buildAgentEvaluationReport', () => {
  it('passes a valid rule-suggestions submission', (t) => {
    const report = buildAgentEvaluationReport({
      casesArtifact: readJson(CASES_PATH),
      casesArtifactPath: CASES_PATH,
      submissionArtifact: ruleSuggestionSubmission(),
      submissionArtifactPath: '/tmp/submission.json',
      now: new Date('2026-06-14T20:15:00.000Z'),
    });

    t.assert.equal(report.summary.overall_status, 'pass');
    t.assert.equal(report.summary.blocking_findings, 0);
    t.assert.equal(report.findings.some((finding) => finding.id === 'rule-summary-phrases' && finding.status === 'pass'), true);
  });

  it('passes a valid research-summary submission and treats the summary type as harness-local', (t) => {
    const report = buildAgentEvaluationReport({
      casesArtifact: readJson(CASES_PATH),
      casesArtifactPath: CASES_PATH,
      submissionArtifact: researchSummarySubmission(),
      submissionArtifactPath: '/tmp/submission.json',
      now: new Date('2026-06-14T20:15:00.000Z'),
    });

    t.assert.equal(report.evaluation_case.output_type, 'research-summary');
    t.assert.equal(report.summary.overall_status, 'pass');
    t.assert.equal(report.findings.some((finding) => finding.id === 'research-uncertainty-phrases' && finding.status === 'pass'), true);
  });

  it('warns when the fixture set is stale without failing the run by itself', (t) => {
    const report = buildAgentEvaluationReport({
      casesArtifact: readJson(CASES_PATH),
      casesArtifactPath: CASES_PATH,
      submissionArtifact: ruleSuggestionSubmission(),
      submissionArtifactPath: '/tmp/submission.json',
      now: new Date('2026-08-01T00:00:00.000Z'),
    });

    t.assert.equal(report.summary.overall_status, 'pass');
    t.assert.equal(report.findings.find((finding) => finding.id === 'fixture-freshness').status, 'warn');
  });

  it('throws when the cases schema version is invalid', (t) => {
    const casesArtifact = readJson(CASES_PATH);
    casesArtifact.schema_version = 2;

    t.assert.throws(
      () => buildAgentEvaluationReport({
        casesArtifact,
        casesArtifactPath: CASES_PATH,
        submissionArtifact: ruleSuggestionSubmission(),
        submissionArtifactPath: '/tmp/submission.json',
      }),
      /schema_version 1/
    );
  });

  it('throws when the cases workflow version is invalid', (t) => {
    const casesArtifact = readJson(CASES_PATH);
    casesArtifact.workflow_version = 'other-version';

    t.assert.throws(
      () => buildAgentEvaluationReport({
        casesArtifact,
        casesArtifactPath: CASES_PATH,
        submissionArtifact: ruleSuggestionSubmission(),
        submissionArtifactPath: '/tmp/submission.json',
      }),
      /workflow_version agent-evaluation-harness-v1/
    );
  });

  it('throws when a case source omits required metadata', (t) => {
    const casesArtifact = readJson(CASES_PATH);
    casesArtifact.cases[0].sources[0].path = '';

    t.assert.throws(
      () => buildAgentEvaluationReport({
        casesArtifact,
        casesArtifactPath: CASES_PATH,
        submissionArtifact: ruleSuggestionSubmission(),
        submissionArtifactPath: '/tmp/submission.json',
      }),
      /non-empty source path values/
    );
  });

  it('fails when required loaded sources are missing', (t) => {
    const submission = ruleSuggestionSubmission();
    submission.loaded_sources = [caseSource('rule-suggestions-fixed-medium-baseline', 'repo-llm-support-service')];

    const report = buildAgentEvaluationReport({
      casesArtifact: readJson(CASES_PATH),
      casesArtifactPath: CASES_PATH,
      submissionArtifact: submission,
      submissionArtifactPath: '/tmp/submission.json',
      now: new Date('2026-06-14T20:15:00.000Z'),
    });

    t.assert.equal(report.summary.overall_status, 'fail');
    t.assert.equal(report.findings.find((finding) => finding.id === 'loaded-source-contract').status, 'fail');
  });

  it('fails when loaded source metadata does not match the case contract', (t) => {
    const submission = ruleSuggestionSubmission();
    submission.loaded_sources[0].kind = 'fixture';
    submission.loaded_sources[0].path = '/tmp/other-source.md';

    const report = buildAgentEvaluationReport({
      casesArtifact: readJson(CASES_PATH),
      casesArtifactPath: CASES_PATH,
      submissionArtifact: submission,
      submissionArtifactPath: '/tmp/submission.json',
      now: new Date('2026-06-14T20:15:00.000Z'),
    });

    t.assert.equal(report.summary.overall_status, 'fail');
    t.assert.equal(report.findings.find((finding) => finding.id === 'loaded-source-contract').status, 'fail');
  });

  it('fails when an individual candidate rule omits scope or source provenance', (t) => {
    const submission = ruleSuggestionSubmission();
    submission.output.candidate_rules[1].scenario_scope = [];
    submission.output.candidate_rules[1].source_ids = [];

    const report = buildAgentEvaluationReport({
      casesArtifact: readJson(CASES_PATH),
      casesArtifactPath: CASES_PATH,
      submissionArtifact: submission,
      submissionArtifactPath: '/tmp/submission.json',
      now: new Date('2026-06-14T20:15:00.000Z'),
    });

    t.assert.equal(report.summary.overall_status, 'fail');
    t.assert.equal(report.findings.find((finding) => finding.id === 'rule-per-candidate-provenance').status, 'fail');
  });

  it('fails when an individual candidate rule drifts outside the case-local contract', (t) => {
    const submission = ruleSuggestionSubmission();
    submission.output.candidate_rules[1].metric = 'throughput_rps';
    submission.output.candidate_rules[1].classification = 'context-signal';
    submission.output.candidate_rules[1].scenario_scope = ['replicas-2'];
    submission.output.candidate_rules[1].source_ids = ['notion-research-workflow'];

    const report = buildAgentEvaluationReport({
      casesArtifact: readJson(CASES_PATH),
      casesArtifactPath: CASES_PATH,
      submissionArtifact: submission,
      submissionArtifactPath: '/tmp/submission.json',
      now: new Date('2026-06-14T20:15:00.000Z'),
    });

    t.assert.equal(report.summary.overall_status, 'fail');
    t.assert.equal(report.findings.find((finding) => finding.id === 'rule-per-candidate-contract').status, 'fail');
  });

  it('fails when a submission adds an extra candidate rule with missing per-item contract fields', (t) => {
    const submission = ruleSuggestionSubmission();
    submission.output.candidate_rules.push({
      name: 'Incomplete Extra Rule',
      classification: '',
      metric: '',
      direction: 'minimize',
      constraint: 'latency_p95_ms <= 800',
      rationale: 'Should not pass when the added rule omits the required per-item fields.',
      scenario_scope: ['fixed-medium'],
      source_ids: ['runtime-summary-fixed-medium'],
      requires_human_approval: true,
    });

    const report = buildAgentEvaluationReport({
      casesArtifact: readJson(CASES_PATH),
      casesArtifactPath: CASES_PATH,
      submissionArtifact: submission,
      submissionArtifactPath: '/tmp/submission.json',
      now: new Date('2026-06-14T20:15:00.000Z'),
    });

    t.assert.equal(report.summary.overall_status, 'fail');
    t.assert.equal(report.findings.find((finding) => finding.id === 'rule-per-candidate-contract').status, 'fail');
  });

  it('fails when candidate rules keep allowed values but break the expected per-rule tuples', (t) => {
    const submission = ruleSuggestionSubmission();
    const firstClassification = submission.output.candidate_rules[0].classification;
    submission.output.candidate_rules[0].classification = submission.output.candidate_rules[1].classification;
    submission.output.candidate_rules[1].classification = firstClassification;

    const report = buildAgentEvaluationReport({
      casesArtifact: readJson(CASES_PATH),
      casesArtifactPath: CASES_PATH,
      submissionArtifact: submission,
      submissionArtifactPath: '/tmp/submission.json',
      now: new Date('2026-06-14T20:15:00.000Z'),
    });

    t.assert.equal(report.summary.overall_status, 'fail');
    t.assert.equal(report.findings.find((finding) => finding.id === 'rule-required-contracts').status, 'fail');
  });

  it('fails when a submission adds a duplicate allowed tuple', (t) => {
    const submission = ruleSuggestionSubmission();
    submission.output.candidate_rules.push({
      ...submission.output.candidate_rules[0],
      constraint: 'latency_p95_ms <= 900',
    });

    const report = buildAgentEvaluationReport({
      casesArtifact: readJson(CASES_PATH),
      casesArtifactPath: CASES_PATH,
      submissionArtifact: submission,
      submissionArtifactPath: '/tmp/submission.json',
      now: new Date('2026-06-14T20:15:00.000Z'),
    });

    t.assert.equal(report.summary.overall_status, 'fail');
    t.assert.equal(report.findings.find((finding) => finding.id === 'rule-required-contracts').status, 'fail');
  });

  it('fails when referenced sources escape the case boundary', (t) => {
    const submission = researchSummarySubmission();
    submission.output.referenced_source_ids.push('notion-other-page');

    const report = buildAgentEvaluationReport({
      casesArtifact: readJson(CASES_PATH),
      casesArtifactPath: CASES_PATH,
      submissionArtifact: submission,
      submissionArtifactPath: '/tmp/submission.json',
      now: new Date('2026-06-14T20:15:00.000Z'),
    });

    t.assert.equal(report.summary.overall_status, 'fail');
    t.assert.equal(report.findings.find((finding) => finding.id === 'research-source-boundary').status, 'fail');
  });

  it('fails when research-summary uncertainty notes are missing', (t) => {
    const submission = researchSummarySubmission();
    submission.output.uncertainty_notes = [];

    const report = buildAgentEvaluationReport({
      casesArtifact: readJson(CASES_PATH),
      casesArtifactPath: CASES_PATH,
      submissionArtifact: submission,
      submissionArtifactPath: '/tmp/submission.json',
      now: new Date('2026-06-14T20:15:00.000Z'),
    });

    t.assert.equal(report.summary.overall_status, 'fail');
    t.assert.equal(report.findings.find((finding) => finding.id === 'research-uncertainty-phrases').status, 'fail');
  });

  it('fails when a case source path is missing on disk', (t) => {
    const casesArtifact = readJson(CASES_PATH);
    casesArtifact.cases[0].sources[0].path = 'load-tests/runtime-scenarios/fixtures/agent-evaluation/missing.md';

    const report = buildAgentEvaluationReport({
      casesArtifact,
      casesArtifactPath: CASES_PATH,
      submissionArtifact: ruleSuggestionSubmission(),
      submissionArtifactPath: '/tmp/submission.json',
      now: new Date('2026-06-14T20:15:00.000Z'),
    });

    t.assert.equal(report.summary.overall_status, 'fail');
    t.assert.equal(report.findings.find((finding) => finding.id === 'case-source-paths').status, 'fail');
  });
});

describe('writeAgentEvaluationReport', () => {
  it('writes the versioned report to disk', (t) => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-eval-harness-'));
    const submissionPath = path.join(tempDir, 'submission.json');
    fs.writeFileSync(submissionPath, JSON.stringify(ruleSuggestionSubmission(), null, 2), 'utf-8');

    const result = writeAgentEvaluationReport({
      casesJson: CASES_PATH,
      submissionJson: submissionPath,
      outputDir: tempDir,
    });

    t.assert.equal(path.basename(result.outputPath), reportOutputFile());
    t.assert.equal(fs.existsSync(result.outputPath), true);
    t.assert.equal(readJson(result.outputPath).workflow_version, HARNESS_WORKFLOW_VERSION);
  });
});

describe('agent-evaluation-harness CLI', () => {
  it('returns zero when only non-blocking findings exist', (t) => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-eval-cli-pass-'));
    const staleCasesPath = path.join(tempDir, 'cases.json');
    const submissionPath = path.join(tempDir, 'submission.json');
    const staleCases = readJson(CASES_PATH);
    staleCases.refreshed_at = '2026-01-01T00:00:00.000Z';
    fs.writeFileSync(staleCasesPath, JSON.stringify(staleCases, null, 2), 'utf-8');
    fs.writeFileSync(submissionPath, JSON.stringify(ruleSuggestionSubmission(), null, 2), 'utf-8');

    const result = childProcess.spawnSync(
      process.execPath,
      [
        path.resolve('load-tests/runtime-scenarios/agent-evaluation-harness-cli.mjs'),
        '--cases-json',
        staleCasesPath,
        '--submission-json',
        submissionPath,
        '--output-dir',
        tempDir,
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf-8',
      }
    );

    t.assert.equal(result.status, 0);
    const report = readJson(path.join(tempDir, reportOutputFile()));
    t.assert.equal(report.findings.find((finding) => finding.id === 'fixture-freshness').status, 'warn');
    t.assert.equal(report.summary.non_blocking_findings > 0, true);
  });

  it('returns non-zero when blocking findings exist', (t) => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-eval-cli-fail-'));
    const submissionPath = path.join(tempDir, 'submission.json');
    const submission = ruleSuggestionSubmission();
    submission.output.candidate_rules[0].requires_human_approval = false;
    fs.writeFileSync(submissionPath, JSON.stringify(submission, null, 2), 'utf-8');

    const result = childProcess.spawnSync(
      process.execPath,
      [
        path.resolve('load-tests/runtime-scenarios/agent-evaluation-harness-cli.mjs'),
        '--cases-json',
        CASES_PATH,
        '--submission-json',
        submissionPath,
        '--output-dir',
        tempDir,
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf-8',
      }
    );

    t.assert.equal(result.status, 1);
  });
});

const caseSource = (caseId, sourceId) => {
  const evaluationCase = CASES_ARTIFACT.cases.find((current) => current.id === caseId);
  const source = evaluationCase.sources.find((current) => current.source_id === sourceId);
  return {
    source_id: source.source_id,
    kind: source.kind,
    path: source.path,
  };
};
