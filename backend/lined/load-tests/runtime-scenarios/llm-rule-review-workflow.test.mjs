import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  buildCandidateId,
  buildRuleReviewWorkflow,
  parseReviewWorkflowArgs,
  writeRuleReviewWorkflow,
} from './llm-rule-review-workflow.mjs';

const advisoryArtifact = () => ({
  schema_version: 1,
  prototype_version: 'llm-support-service-prototype-v1',
  provider: 'mock',
  model: 'deterministic-mock-v1',
  generated_at: '2026-06-13T10:00:00.000Z',
  source_artifacts: [
    { artifactType: 'requirements-md', path: '/tmp/requirements.md' },
    { artifactType: 'runtime-summary', path: '/tmp/runtime-summary.json', identity: 'fixed-medium:baseline:local-kind' },
  ],
  candidate_rules: [
    {
      name: 'Latency P95 Local',
      classification: 'objective-with-constraint',
      metric: 'latency_p95_ms',
      direction: 'minimize',
      constraint: 'latency_p95_ms <= 1000',
      rationale: 'Bound user-visible latency for stable comparisons.',
      evidence: 'existing-k6-guardrail',
      scenarioScope: ['fixed-medium', 'replicas-2'],
      requires_human_approval: true,
    },
    {
      name: 'CPU Pressure Local',
      classification: 'warning',
      metric: 'cpu_utilization',
      direction: 'maximize',
      constraint: 'cpu_utilization > 0.85',
      rationale: 'Highlight scalability pressure.',
      evidence: 'future-calibration-needed',
      scenarioScope: ['replicas-2'],
      requires_human_approval: true,
    },
  ],
  review_notes: ['Advisory only.'],
  tradeoff_explanations: [],
});

const reviewInputArtifact = (candidateIds) => ({
  reviewer: {
    name: 'Research Reviewer',
    role: 'architect',
  },
  reviewed_at: '2026-06-13T11:00:00.000Z',
  advisory_metadata: {
    prompt_version: 'llm-support-service-prototype-v1-prompt',
    retrieved_sources: ['docs/llm-support-service.md', 'load-tests/runtime-scenarios/slo-thresholds-v1.json'],
    latency_ms: 812,
    cost_usd: 0.03,
  },
  decisions: [
    {
      candidate_id: candidateIds[0],
      validated_classification: 'objective-with-constraint',
      decision: 'promote',
      rationale: 'Backed by explicit runtime evidence and review.',
      reason_codes: ['source-backed', 'telemetry-linked'],
      referenced_source_artifacts: ['/tmp/runtime-summary.json', '/tmp/requirements.md'],
      validation: {
        measurable: true,
        telemetry_linked: true,
        threshold_basis: 'source-backed',
        duplicate_conflict_status: 'unique',
        evidence_status: 'sufficient',
      },
    },
    {
      candidate_id: candidateIds[1],
      validated_classification: 'warning',
      decision: 'hold',
      rationale: 'Needs stronger calibration.',
      reason_codes: ['needs-calibration'],
      referenced_source_artifacts: ['/tmp/runtime-summary.json'],
      validation: {
        measurable: true,
        telemetry_linked: true,
        threshold_basis: 'initial-assumption',
        duplicate_conflict_status: 'unique',
        evidence_status: 'partial',
      },
    },
  ],
});

describe('parseReviewWorkflowArgs', () => {
  it('accepts required options', (t) => {
    const options = parseReviewWorkflowArgs([
      '--advisory-json',
      'advisory.json',
      '--review-input-json',
      'review.json',
      '--promoted-version',
      'reviewed-rules-v2',
      '--output-dir',
      'out',
    ]);

    t.assert.equal(options.advisoryJson, 'advisory.json');
    t.assert.equal(options.reviewInputJson, 'review.json');
    t.assert.equal(options.promotedVersion, 'reviewed-rules-v2');
    t.assert.equal(options.outputDir, 'out');
  });
});

describe('buildCandidateId', () => {
  it('derives deterministic candidate IDs from rule content', (t) => {
    const rule = advisoryArtifact().candidate_rules[0];
    const first = buildCandidateId(rule);
    const second = buildCandidateId({ ...rule, scenarioScope: ['replicas-2', 'fixed-medium'] });
    const changedRationale = buildCandidateId({
      ...rule,
      rationale: 'A materially different explanation.',
    });

    t.assert.equal(first, second);
    t.assert.notEqual(first, changedRationale);
    t.assert.match(first, /^latency-p95-local-/);
  });
});

describe('buildRuleReviewWorkflow', () => {
  it('emits reviewed and promoted artifacts with provenance retention', (t) => {
    const advisory = advisoryArtifact();
    const candidateIds = advisory.candidate_rules.map((rule) => buildCandidateId(rule));
    const result = buildRuleReviewWorkflow({
      advisory,
      advisoryPath: '/tmp/candidate-rule-suggestions.json',
      promotedVersion: 'reviewed-rules-v9',
      reviewInput: reviewInputArtifact(candidateIds),
      reviewInputPath: '/tmp/review-input.json',
    });

    t.assert.equal(result.reviewArtifact.reviewed_rules.length, 2);
    t.assert.equal(result.reviewArtifact.reviewed_rules[0].candidate_id, candidateIds[0]);
    t.assert.equal(result.reviewArtifact.reviewed_rules[0].review.promotion_eligible, true);
    t.assert.equal(result.reviewArtifact.reviewed_rules[1].review.promotion_eligible, false);
    t.assert.equal(result.reviewArtifact.advisory_run.prompt_version, 'llm-support-service-prototype-v1-prompt');
    t.assert.equal(result.reviewArtifact.advisory_run.latency_ms, 812);
    t.assert.equal(result.promotedArtifact.config_version, 'reviewed-rules-v9');
    t.assert.equal(result.promotedArtifact.promoted_rules.length, 1);
    t.assert.equal(result.promotedArtifact.promoted_rules[0].candidate_id, candidateIds[0]);
  });

  it('rejects duplicate or stale review decisions', (t) => {
    const advisory = advisoryArtifact();
    const candidateIds = advisory.candidate_rules.map((rule) => buildCandidateId(rule));
    const duplicateDecisionInput = reviewInputArtifact(candidateIds);
    duplicateDecisionInput.decisions.push({
      ...duplicateDecisionInput.decisions[0],
      decision: 'reject',
    });
    t.assert.throws(
      () => buildRuleReviewWorkflow({
        advisory,
        advisoryPath: '/tmp/candidate-rule-suggestions.json',
        promotedVersion: 'reviewed-rules-v1',
        reviewInput: duplicateDecisionInput,
        reviewInputPath: '/tmp/review-input.json',
      }),
      /Duplicate review decision/
    );

    const staleDecisionInput = reviewInputArtifact(candidateIds);
    staleDecisionInput.decisions[1].candidate_id = 'stale-candidate-123';
    t.assert.throws(
      () => buildRuleReviewWorkflow({
        advisory,
        advisoryPath: '/tmp/candidate-rule-suggestions.json',
        promotedVersion: 'reviewed-rules-v1',
        reviewInput: staleDecisionInput,
        reviewInputPath: '/tmp/review-input.json',
      }),
      /unknown candidate ID/
    );
  });

  it('rejects duplicate advisory candidate IDs', (t) => {
    const advisory = advisoryArtifact();
    const duplicatedRule = {
      ...advisory.candidate_rules[1],
      candidate_id: buildCandidateId(advisory.candidate_rules[0]),
    };
    advisory.candidate_rules[1] = duplicatedRule;
    const candidateIds = advisory.candidate_rules.map((rule) => rule.candidate_id ?? buildCandidateId(rule));

    t.assert.throws(
      () => buildRuleReviewWorkflow({
        advisory,
        advisoryPath: '/tmp/candidate-rule-suggestions.json',
        promotedVersion: 'reviewed-rules-v1',
        reviewInput: reviewInputArtifact(candidateIds),
        reviewInputPath: '/tmp/review-input.json',
      }),
      /Duplicate advisory candidate ID/
    );
  });

  it('rejects unsupported validated classifications', (t) => {
    const advisory = advisoryArtifact();
    const candidateIds = advisory.candidate_rules.map((rule) => buildCandidateId(rule));
    const reviewInput = reviewInputArtifact(candidateIds);
    reviewInput.decisions[0].validated_classification = 'typo-role';

    t.assert.throws(
      () => buildRuleReviewWorkflow({
        advisory,
        advisoryPath: '/tmp/candidate-rule-suggestions.json',
        promotedVersion: 'reviewed-rules-v1',
        reviewInput,
        reviewInputPath: '/tmp/review-input.json',
      }),
      /Unsupported validated classification/
    );
  });

  it('requires rationale, reason codes, and referenced source artifacts for promotion', (t) => {
    const advisory = advisoryArtifact();
    const candidateIds = advisory.candidate_rules.map((rule) => buildCandidateId(rule));
    const reviewInput = reviewInputArtifact(candidateIds);
    reviewInput.decisions[0].rationale = '';
    reviewInput.decisions[0].reason_codes = [];
    reviewInput.decisions[0].referenced_source_artifacts = [];

    const result = buildRuleReviewWorkflow({
      advisory,
      advisoryPath: '/tmp/candidate-rule-suggestions.json',
      promotedVersion: 'reviewed-rules-v1',
      reviewInput,
      reviewInputPath: '/tmp/review-input.json',
    });

    t.assert.equal(result.reviewArtifact.reviewed_rules[0].review.promotion_eligible, false);
    t.assert.equal(result.promotedArtifact.promoted_rules.length, 0);
  });
});

describe('writeRuleReviewWorkflow', () => {
  it('writes separate review and promotion artifacts', (t) => {
    const advisory = advisoryArtifact();
    const candidateIds = advisory.candidate_rules.map((rule) => buildCandidateId(rule));
    const reviewInput = reviewInputArtifact(candidateIds);
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'llm-rule-review-'));
    const advisoryPath = path.join(tempDir, 'candidate-rule-suggestions.json');
    const reviewInputPath = path.join(tempDir, 'review-input.json');
    const outputDir = path.join(tempDir, 'out');
    fs.writeFileSync(advisoryPath, JSON.stringify(advisory, null, 2), 'utf-8');
    fs.writeFileSync(reviewInputPath, JSON.stringify(reviewInput, null, 2), 'utf-8');

    const result = writeRuleReviewWorkflow({
      advisoryJson: advisoryPath,
      reviewInputJson: reviewInputPath,
      promotedVersion: 'reviewed-rules-v1',
      outputDir,
    });

    t.assert.equal(result.outputs.length, 2);
    t.assert.equal(path.basename(result.outputs[0]), 'reviewed-candidate-rules.json');
    t.assert.equal(path.basename(result.outputs[1]), 'promoted-fitness-config-v1.json');
    const writtenPromoted = JSON.parse(fs.readFileSync(result.outputs[1], 'utf-8'));
    t.assert.equal(writtenPromoted.promoted_rules.length, 1);
  });
});
