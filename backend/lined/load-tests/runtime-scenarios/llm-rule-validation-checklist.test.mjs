import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  buildRuleValidationChecklist,
  parseChecklistArgs,
  writeRuleValidationChecklist,
} from './llm-rule-validation-checklist.mjs';

const reviewedArtifact = () => ({
  schema_version: 1,
  workflow_version: 'llm-rule-review-workflow-v1',
  advisory_run: {
    provider: 'mock',
  },
  reviewer: {
    name: 'Research Reviewer',
    role: 'architect',
    reviewed_at: '2026-06-13T11:00:00.000Z',
  },
  reviewed_rules: [
    {
      candidate_id: 'latency-p95-local-123',
      name: 'Latency P95 Local',
      review: {
        decision: 'promote',
        promotion_eligible: true,
        rationale: 'Backed by explicit runtime evidence and review.',
        reason_codes: ['source-backed', 'telemetry-linked'],
        referenced_source_artifacts: ['/tmp/runtime-summary.json', '/tmp/requirements.md'],
        validated_classification: 'objective-with-constraint',
        validation: {
          duplicate_conflict_status: 'unique',
          evidence_status: 'sufficient',
          measurable: true,
          telemetry_linked: true,
          threshold_basis: 'source-backed',
        },
      },
    },
    {
      candidate_id: 'cpu-pressure-local-456',
      name: 'CPU Pressure Local',
      review: {
        decision: 'hold',
        promotion_eligible: false,
        rationale: 'Needs stronger calibration.',
        reason_codes: ['needs-calibration'],
        referenced_source_artifacts: ['/tmp/runtime-summary.json'],
        validated_classification: 'warning',
        validation: {
          duplicate_conflict_status: 'unique',
          evidence_status: 'partial',
          measurable: true,
          telemetry_linked: true,
          threshold_basis: 'initial-assumption',
        },
      },
    },
  ],
});

describe('parseChecklistArgs', () => {
  it('accepts required options', (t) => {
    const options = parseChecklistArgs([
      '--reviewed-json',
      'reviewed.json',
      '--output-dir',
      'out',
    ]);

    t.assert.equal(options.reviewedJson, 'reviewed.json');
    t.assert.equal(options.outputDir, 'out');
  });
});

describe('buildRuleValidationChecklist', () => {
  it('builds a checklist report with pass and warn outcomes', (t) => {
    const report = buildRuleValidationChecklist({
      reviewedArtifact: reviewedArtifact(),
      reviewedArtifactPath: '/tmp/reviewed-candidate-rules.json',
    });

    t.assert.equal(report.summary.reviewedRules, 2);
    t.assert.equal(report.summary.pass, 1);
    t.assert.equal(report.summary.warn, 1);
    t.assert.equal(report.summary.fail, 0);
    t.assert.equal(report.summary.promotionReady, 1);
    t.assert.equal(report.checklist_results[0].classificationLane, 'objective');
    t.assert.equal(report.checklist_results[1].checks.thresholdRationale.status, 'warn');
  });

  it('fails rules with missing evidence or expert approval fields', (t) => {
    const artifact = reviewedArtifact();
    artifact.reviewed_rules[0].review.reason_codes = [];
    artifact.reviewed_rules[0].review.referenced_source_artifacts = [];
    artifact.reviewed_rules[0].review.validation.evidence_status = 'missing';
    artifact.reviewed_rules[0].review.validation.telemetry_linked = false;
    artifact.reviewed_rules[0].review.decision = '';

    const report = buildRuleValidationChecklist({
      reviewedArtifact: artifact,
      reviewedArtifactPath: '/tmp/reviewed-candidate-rules.json',
    });

    t.assert.equal(report.summary.fail, 1);
    t.assert.equal(report.summary.promotionReady, 0);
    t.assert.equal(report.checklist_results[0].overallStatus, 'fail');
    t.assert.equal(report.checklist_results[0].checks.expertApproval.status, 'fail');
    t.assert.equal(report.checklist_results[0].checks.sourceEvidence.status, 'fail');
    t.assert.equal(report.checklist_results[0].checks.telemetryLinkage.status, 'fail');
  });

  it('fails rules when evidence status is absent even if artifacts are referenced', (t) => {
    const artifact = reviewedArtifact();
    delete artifact.reviewed_rules[0].review.validation.evidence_status;

    const report = buildRuleValidationChecklist({
      reviewedArtifact: artifact,
      reviewedArtifactPath: '/tmp/reviewed-candidate-rules.json',
    });

    t.assert.equal(report.summary.fail, 1);
    t.assert.equal(report.summary.promotionReady, 0);
    t.assert.equal(report.checklist_results[0].checks.sourceEvidence.status, 'fail');
  });

  it('does not mark non-eligible reviewed rules as promotion-ready', (t) => {
    const artifact = reviewedArtifact();
    artifact.reviewed_rules[0].review.promotion_eligible = false;

    const report = buildRuleValidationChecklist({
      reviewedArtifact: artifact,
      reviewedArtifactPath: '/tmp/reviewed-candidate-rules.json',
    });

    t.assert.equal(report.summary.pass, 1);
    t.assert.equal(report.summary.warn, 1);
    t.assert.equal(report.summary.promotionReady, 0);
    t.assert.equal(report.promotion_candidates.length, 0);
  });
});

describe('writeRuleValidationChecklist', () => {
  it('writes the versioned checklist report to the requested output directory', (t) => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'llm-rule-checklist-'));
    const reviewedPath = path.join(tempDir, 'reviewed-candidate-rules.json');
    const outputDir = path.join(tempDir, 'out');
    fs.writeFileSync(reviewedPath, JSON.stringify(reviewedArtifact(), null, 2), 'utf-8');

    const result = writeRuleValidationChecklist({
      reviewedJson: reviewedPath,
      outputDir,
    });

    t.assert.equal(path.basename(result.outputPath), 'llm-rule-validation-report.json');
    t.assert.equal(fs.existsSync(result.outputPath), true);
    const written = JSON.parse(fs.readFileSync(result.outputPath, 'utf-8'));
    t.assert.equal(written.checklist_version, 'llm-rule-validation-checklist-v1');
    t.assert.equal(written.summary.promotionReady, 1);
  });
});
