import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';

import {
  buildGuardrailEvaluationReport,
  parseGuardrailArgs,
  writeGuardrailEvaluation,
} from './llm-guardrail-evaluation.mjs';
import {
  buildRuleReviewWorkflow,
  normalizeCandidateRule,
} from './llm-rule-review-workflow.mjs';
import { buildRuleValidationChecklist } from './llm-rule-validation-checklist.mjs';

const advisoryArtifact = () => ({
  schema_version: 1,
  prototype_version: 'llm-support-service-prototype-v1',
  provider: 'mock',
  model: 'deterministic-mock-v1',
  generated_at: '2026-06-14T10:00:00.000Z',
  source_artifacts: [{
    artifactType: 'runtime-summary',
    identity: 'fixed-medium',
    path: '/tmp/runtime-summary.json',
  }],
  candidate_rules: [{
    name: 'Latency P95 Local',
    classification: 'objective-with-constraint',
    metric: 'latency_p95_ms',
    direction: 'minimize',
    constraint: 'latency_p95_ms <= 1000',
    rationale: 'Backed by explicit runtime evidence.',
    evidence: 'existing-k6-guardrail',
    scenarioScope: ['fixed-medium', 'replicas-2'],
    requires_human_approval: true,
  }],
  tradeoff_explanations: [],
  review_notes: [
    'All candidate rules are advisory only and require human approval before promotion.',
  ],
});

const reviewInput = (candidateId) => ({
  reviewer: {
    name: 'Research Reviewer',
    role: 'architect',
  },
  reviewed_at: '2026-06-14T11:00:00.000Z',
  advisory_metadata: {
    prompt_version: 'llm-support-service-prototype-v1-prompt',
    retrieved_sources: ['docs/research/ai/llm-support-service.md'],
    latency_ms: 811,
    cost_usd: 0.03,
    failure_mode: '',
  },
  decisions: [{
    candidate_id: candidateId,
    validated_classification: 'objective-with-constraint',
    decision: 'promote',
    rationale: 'Backed by telemetry and source evidence.',
    reason_codes: ['source-backed', 'telemetry-linked'],
    referenced_source_artifacts: ['/tmp/runtime-summary.json', '/tmp/requirements.md'],
    validation: {
      measurable: true,
      telemetry_linked: true,
      threshold_basis: 'source-backed',
      duplicate_conflict_status: 'unique',
      evidence_status: 'sufficient',
    },
  }],
});

const resultsReport = () => ({
  canonicalComparison: {
    status: 'available',
  },
  limitations: {
    canonicalComparisonReasons: [],
    canonicalComparisonStatus: 'available',
    excludedEvidenceCount: 0,
    excludedEvidenceReasons: [],
    missingRuntimeMetrics: [],
    omittedObjectives: [],
  },
  tables: {
    decisionUsefulness: [{
      betterThanScalarTop: 'cpu_utilization',
      candidateId: 'replicas-2:baseline:local-kind',
      comparatorOmittedObjectives: '',
      fixedScalarRank: '2',
      fixedScalarTopCandidateId: 'fixed-medium:baseline:local-kind',
      paretoRank: '1',
      rationale: 'Improves cpu_utilization while sacrificing latency_p95_ms.',
      reasonCodes: '',
      usefulnessClassification: 'multiple-tradeoff-alternatives',
      worseThanScalarTop: 'latency_p95_ms',
    }],
    paretoCandidates: [{
      activeObjectives: 'latency_p95_ms|cpu_utilization',
      candidateId: 'replicas-2:baseline:local-kind',
      crowdingDistance: '1',
      omittedObjectives: '',
      rank: '1',
      selected: 'true',
      sourcePath: 'metrics.json',
    }],
  },
});

const reviewedExplanationsArtifact = () => ({
  workflow_version: 'llm-tradeoff-explanations-v1',
  source_artifacts: [{
    artifactType: 'results-report-json',
    path: '/tmp/results-report.json',
  }],
  reviewer: {
    name: 'Research Reviewer',
    role: 'architect',
    reviewed_at: '2026-06-14T12:00:00.000Z',
  },
  reviewed_explanations: [{
    candidate_id: 'replicas-2:baseline:local-kind',
    evidence_refs: [
      'results-report:/tmp/results-report.json',
      'decision-candidate:replicas-2:baseline:local-kind',
      'scalar-top:fixed-medium:baseline:local-kind',
      'pareto-rank:replicas-2:baseline:local-kind:1',
    ],
    explanation_id: 'replicas-2-fixed-medium-123',
    explanation_type: 'candidate-tradeoff',
    fixed_scalar_top_candidate_id: 'fixed-medium:baseline:local-kind',
    limitations: [],
    requires_human_review: true,
    review: {
      article_readiness: 'ready',
      rationale: 'Grounded in the supplied report.',
      reason_codes: ['pareto-traceable'],
      referenced_source_artifacts: [
        '/tmp/results-report.json',
        'decision-candidate:replicas-2:baseline:local-kind',
      ],
      status: 'accepted',
    },
    summary: 'Replicas-2 improves CPU utilization at the cost of latency.',
    title: 'Replicas-2 trade-off',
  }],
});

const summaryOnlyResultsReport = () => ({
  canonicalComparison: {
    status: 'available',
  },
  limitations: {
    canonicalComparisonReasons: [],
    canonicalComparisonStatus: 'available',
    excludedEvidenceCount: 0,
    excludedEvidenceReasons: [],
    missingRuntimeMetrics: [],
    omittedObjectives: [],
  },
  tables: {
    decisionUsefulness: [{
      betterThanScalarTop: '',
      candidateId: '',
      comparatorOmittedObjectives: '',
      fixedScalarRank: '',
      fixedScalarTopCandidateId: 'fixed-medium:baseline:local-kind',
      paretoRank: '',
      rationale: 'No distinct Pareto alternative is currently supported.',
      reasonCodes: '',
      usefulnessClassification: 'single-best-only',
      worseThanScalarTop: '',
    }],
    paretoCandidates: [],
  },
});

const reviewedComparisonSummaryArtifact = () => ({
  workflow_version: 'llm-tradeoff-explanations-v1',
  source_artifacts: [{
    artifactType: 'results-report-json',
    path: '/tmp/results-report.json',
  }],
  reviewer: {
    name: 'Research Reviewer',
    role: 'architect',
    reviewed_at: '2026-06-14T12:00:00.000Z',
  },
  reviewed_explanations: [{
    candidate_id: '',
    evidence_refs: [
      'results-report:/tmp/results-report.json',
      'scalar-top:fixed-medium:baseline:local-kind',
    ],
    explanation_id: 'summary-fixed-medium-123',
    explanation_type: 'comparison-summary',
    fixed_scalar_top_candidate_id: 'fixed-medium:baseline:local-kind',
    limitations: [],
    requires_human_review: true,
    review: {
      article_readiness: 'ready',
      rationale: 'Grounded in the supplied report.',
      reason_codes: ['scalar-top-confirmed'],
      referenced_source_artifacts: [
        '/tmp/results-report.json',
        'scalar-top:fixed-medium:baseline:local-kind',
      ],
      status: 'accepted',
    },
    summary: 'The scalar-top candidate remains the only supported choice.',
    title: 'Comparison summary for fixed-medium',
  }],
});

describe('parseGuardrailArgs', () => {
  it('accepts all required lane inputs', (t) => {
    const options = parseGuardrailArgs([
      '--lane',
      'all',
      '--advisory-json',
      'advisory.json',
      '--reviewed-json',
      'reviewed.json',
      '--promoted-json',
      'promoted.json',
      '--checklist-json',
      'checklist.json',
      '--results-report-json',
      'results.json',
      '--reviewed-explanations-json',
      'reviewed-explanations.json',
      '--output-dir',
      'out',
    ]);

    t.assert.equal(options.lane, 'all');
    t.assert.equal(options.outputDir, 'out');
    t.assert.equal(options.resultsReportJson, 'results.json');
  });

  it('rejects unknown lanes', (t) => {
    t.assert.throws(
      () => parseGuardrailArgs(['--lane', 'unsupported', '--output-dir', 'out']),
      /--lane must be one of/
    );
  });
});

describe('buildGuardrailEvaluationReport', () => {
  it('passes both lanes for a consistent artifact chain', (t) => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guardrail-pass-'));
    const artifacts = buildPromotionArtifacts(tempDir);
    const report = buildGuardrailEvaluationReport({
      lane: 'all',
      repoRoot: tempDir,
      sources: {
        ...artifacts,
        resultsReport: resultsReport(),
        resultsReportPath: '/tmp/results-report.json',
        reviewedExplanationsArtifact: reviewedExplanationsArtifact(),
        reviewedExplanationsPath: '/tmp/reviewed-tradeoff-explanations.json',
      },
    });

    t.assert.equal(report.summary.requested_lane_status, 'pass');
    t.assert.equal(report.lanes.promotion.status, 'pass');
    t.assert.equal(report.lanes['article-claim'].status, 'pass');
  });

  it('fails promotion lane when advisory human approval is missing', (t) => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guardrail-human-approval-'));
    const artifacts = buildPromotionArtifacts(tempDir, '/tmp/reviewed-candidate-rules.json', {
      mutateAdvisory: (artifact) => {
        artifact.candidate_rules[0].requires_human_approval = false;
      },
    });
    const report = buildGuardrailEvaluationReport({
      lane: 'promotion',
      repoRoot: tempDir,
      sources: artifacts,
    });

    t.assert.equal(report.lanes.promotion.status, 'fail');
    t.assert.equal(
      report.lanes.promotion.findings.some((finding) => finding.id.startsWith('human-approval:')),
      true
    );
  });

  it('fails promotion lane on promoted/checklist drift and monorepo consumer references', (t) => {
    const repoRoot = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'guardrail-monorepo-')), 'backend', 'lined');
    fs.mkdirSync(repoRoot, { recursive: true });
    const artifacts = buildPromotionArtifacts(repoRoot, '/tmp/reviewed-candidate-rules.json', {
      mutateChecklist: (artifact) => {
        artifact.promotion_candidates = [];
      },
    });
    const siblingAnalyzer = path.join(repoRoot, '..', '..', 'fitness-metrics-analyzer');
    fs.mkdirSync(siblingAnalyzer, { recursive: true });
    fs.writeFileSync(
      path.join(siblingAnalyzer, 'main.py'),
      'ARTIFACT = "promoted-fitness-config-v1.json"\n',
      'utf-8'
    );
    const report = buildGuardrailEvaluationReport({
      lane: 'promotion',
      repoRoot,
      sources: artifacts,
    });

    t.assert.equal(report.lanes.promotion.status, 'fail');
    t.assert.equal(report.lanes.promotion.repo_consumer_inspection.matches.length, 1);
  });

  it('fails article lane when any explanation is not accepted or not ready', (t) => {
    const brokenReviewedExplanations = reviewedExplanationsArtifact();
    brokenReviewedExplanations.reviewed_explanations.push({
      evidence_refs: ['candidate:fixed-medium'],
      explanation_id: 'fixed-medium-summary-456',
      requires_human_review: true,
      review: {
        article_readiness: 'not-ready',
        rationale: 'Needs revision.',
        reason_codes: ['not-ready'],
        referenced_source_artifacts: ['/tmp/results-report.json'],
        status: 'revise',
      },
    });

    const report = buildGuardrailEvaluationReport({
      lane: 'article-claim',
      repoRoot: fs.mkdtempSync(path.join(os.tmpdir(), 'guardrail-article-fail-')),
      sources: {
        resultsReport: resultsReport(),
        resultsReportPath: '/tmp/results-report.json',
        reviewedExplanationsArtifact: brokenReviewedExplanations,
        reviewedExplanationsPath: '/tmp/reviewed-tradeoff-explanations.json',
      },
    });

    t.assert.equal(report.lanes['article-claim'].status, 'fail');
  });

  it('passes article lane for legitimate comparison-summary reviewed explanations', (t) => {
    const report = buildGuardrailEvaluationReport({
      lane: 'article-claim',
      repoRoot: fs.mkdtempSync(path.join(os.tmpdir(), 'guardrail-summary-pass-')),
      sources: {
        resultsReport: summaryOnlyResultsReport(),
        resultsReportPath: '/tmp/results-report.json',
        reviewedExplanationsArtifact: reviewedComparisonSummaryArtifact(),
        reviewedExplanationsPath: '/tmp/reviewed-tradeoff-explanations.json',
      },
    });

    t.assert.equal(report.lanes['article-claim'].status, 'pass');
  });

  it('fails article lane when the reviewed explanation shape is incomplete', (t) => {
    const malformedReviewedExplanations = reviewedExplanationsArtifact();
    delete malformedReviewedExplanations.reviewed_explanations[0].candidate_id;
    delete malformedReviewedExplanations.reviewed_explanations[0].fixed_scalar_top_candidate_id;
    delete malformedReviewedExplanations.reviewed_explanations[0].title;
    delete malformedReviewedExplanations.reviewed_explanations[0].summary;
    delete malformedReviewedExplanations.reviewed_explanations[0].limitations;
    malformedReviewedExplanations.reviewed_explanations[0].evidence_refs = [];
    malformedReviewedExplanations.reviewed_explanations[0].review.reason_codes = [];
    malformedReviewedExplanations.reviewed_explanations[0].review.referenced_source_artifacts = [];

    const report = buildGuardrailEvaluationReport({
      lane: 'article-claim',
      repoRoot: fs.mkdtempSync(path.join(os.tmpdir(), 'guardrail-article-shape-fail-')),
      sources: {
        resultsReport: resultsReport(),
        resultsReportPath: '/tmp/results-report.json',
        reviewedExplanationsArtifact: malformedReviewedExplanations,
        reviewedExplanationsPath: '/tmp/reviewed-tradeoff-explanations.json',
      },
    });

    t.assert.equal(report.lanes['article-claim'].status, 'fail');
    t.assert.equal(
      report.lanes['article-claim'].findings.some((finding) => finding.id.startsWith('shape:')),
      true
    );
  });

  it('fails article lane when review rationale is blank', (t) => {
    const malformedReviewedExplanations = reviewedExplanationsArtifact();
    malformedReviewedExplanations.reviewed_explanations[0].review.rationale = ' ';

    const report = buildGuardrailEvaluationReport({
      lane: 'article-claim',
      repoRoot: fs.mkdtempSync(path.join(os.tmpdir(), 'guardrail-review-rationale-')),
      sources: {
        resultsReport: resultsReport(),
        resultsReportPath: '/tmp/results-report.json',
        reviewedExplanationsArtifact: malformedReviewedExplanations,
        reviewedExplanationsPath: '/tmp/reviewed-tradeoff-explanations.json',
      },
    });

    t.assert.equal(report.lanes['article-claim'].status, 'fail');
    t.assert.equal(
      report.lanes['article-claim'].findings.some((finding) => finding.id.endsWith(':review_rationale')),
      true
    );
  });

  it('fails article lane when explanation refs are silently retargeted to another candidate', (t) => {
    const twoCandidateReport = resultsReport();
    twoCandidateReport.tables.decisionUsefulness.push({
      betterThanScalarTop: 'latency_p95_ms',
      candidateId: 'fixed-small:baseline:local-kind',
      comparatorOmittedObjectives: '',
      fixedScalarRank: '3',
      fixedScalarTopCandidateId: 'fixed-medium:baseline:local-kind',
      paretoRank: '2',
      rationale: 'Improves latency at the cost of CPU utilization.',
      reasonCodes: '',
      usefulnessClassification: 'multiple-tradeoff-alternatives',
      worseThanScalarTop: 'cpu_utilization',
    });
    twoCandidateReport.tables.paretoCandidates.push({
      activeObjectives: 'latency_p95_ms|cpu_utilization',
      candidateId: 'fixed-small:baseline:local-kind',
      crowdingDistance: '1',
      omittedObjectives: '',
      rank: '2',
      selected: 'true',
      sourcePath: 'metrics-small.json',
    });

    const retargetedReviewedExplanations = reviewedExplanationsArtifact();
    retargetedReviewedExplanations.reviewed_explanations[0].evidence_refs = [
      'results-report:/tmp/results-report.json',
      'decision-candidate:fixed-small:baseline:local-kind',
      'scalar-top:fixed-medium:baseline:local-kind',
      'pareto-rank:fixed-small:baseline:local-kind:2',
    ];

    const report = buildGuardrailEvaluationReport({
      lane: 'article-claim',
      repoRoot: fs.mkdtempSync(path.join(os.tmpdir(), 'guardrail-article-retarget-fail-')),
      sources: {
        resultsReport: twoCandidateReport,
        resultsReportPath: '/tmp/results-report.json',
        reviewedExplanationsArtifact: retargetedReviewedExplanations,
        reviewedExplanationsPath: '/tmp/reviewed-tradeoff-explanations.json',
      },
    });

    t.assert.equal(report.lanes['article-claim'].status, 'fail');
    t.assert.equal(
      report.lanes['article-claim'].findings.some((finding) => finding.id.startsWith('evidence-target:')),
      true
    );
  });

  it('fails article lane when fixed scalar top or shared limitations drift from the canonical report', (t) => {
    const limitedResultsReport = resultsReport();
    limitedResultsReport.limitations.excludedEvidenceCount = 1;
    limitedResultsReport.limitations.excludedEvidenceReasons = ['missing-load-window'];

    const driftedReviewedExplanations = reviewedExplanationsArtifact();
    driftedReviewedExplanations.reviewed_explanations[0].fixed_scalar_top_candidate_id = 'fixed-small:baseline:local-kind';
    driftedReviewedExplanations.reviewed_explanations[0].limitations = [];
    driftedReviewedExplanations.reviewed_explanations[0].evidence_refs = [
      'results-report:/tmp/results-report.json',
      'decision-candidate:replicas-2:baseline:local-kind',
      'scalar-top:fixed-small:baseline:local-kind',
      'pareto-rank:replicas-2:baseline:local-kind:1',
    ];

    const report = buildGuardrailEvaluationReport({
      lane: 'article-claim',
      repoRoot: fs.mkdtempSync(path.join(os.tmpdir(), 'guardrail-article-limitations-fail-')),
      sources: {
        resultsReport: limitedResultsReport,
        resultsReportPath: '/tmp/results-report.json',
        reviewedExplanationsArtifact: driftedReviewedExplanations,
        reviewedExplanationsPath: '/tmp/reviewed-tradeoff-explanations.json',
      },
    });

    t.assert.equal(report.lanes['article-claim'].status, 'fail');
    t.assert.equal(
      report.lanes['article-claim'].findings.some((finding) => finding.id.includes('fixed_scalar_top_candidate_id')),
      true
    );
    t.assert.equal(
      report.lanes['article-claim'].findings.some((finding) => finding.id.includes('limitations-content')),
      true
    );
  });

  it('fails promotion lane on classification drift across reviewed, promoted, and checklist artifacts', (t) => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guardrail-classification-drift-'));
    const artifacts = buildPromotionArtifacts('/tmp/candidate-rule-suggestions.json', '/tmp/reviewed-candidate-rules.json', {
      mutateChecklist: (artifact) => {
        artifact.promotion_candidates[0].validated_classification = 'hard-constraint';
      },
      mutatePromoted: (artifact) => {
        artifact.promoted_rules[0].classification = 'exploratory';
      },
    });
    const report = buildGuardrailEvaluationReport({
      lane: 'promotion',
      repoRoot: tempDir,
      sources: artifacts,
    });

    t.assert.equal(report.lanes.promotion.status, 'fail');
    t.assert.equal(
      report.lanes.promotion.findings.some((finding) => finding.id.startsWith('classification-drift:')),
      true
    );
  });

  it('fails promotion lane when checklist provenance points to a different reviewed artifact', (t) => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guardrail-review-path-drift-'));
    const artifacts = buildPromotionArtifacts('/tmp/candidate-rule-suggestions.json', '/tmp/reviewed-candidate-rules.json', {
      mutateChecklist: (artifact) => {
        artifact.reviewed_artifact_path = '/tmp/other-reviewed-candidate-rules.json';
      },
    });
    const report = buildGuardrailEvaluationReport({
      lane: 'promotion',
      repoRoot: tempDir,
      sources: artifacts,
    });

    t.assert.equal(report.lanes.promotion.status, 'fail');
    t.assert.equal(
      report.lanes.promotion.findings.some((finding) => finding.id === 'reviewed-artifact-path'),
      true
    );
  });
});

describe('writeGuardrailEvaluation', () => {
  it('writes the guardrail report to disk', (t) => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guardrail-write-'));
    const promotionArtifacts = writePromotionArtifacts(tempDir);
    const outputDir = path.join(tempDir, 'out');

    const result = writeGuardrailEvaluation({
      advisoryJson: promotionArtifacts.advisoryPath,
      checklistJson: promotionArtifacts.checklistPath,
      lane: 'promotion',
      outputDir,
      promotedJson: promotionArtifacts.promotedPath,
      repoRoot: tempDir,
      reviewedJson: promotionArtifacts.reviewedPath,
    });

    t.assert.equal(path.basename(result.outputPath), 'llm-guardrail-report.json');
    t.assert.equal(fs.existsSync(result.outputPath), true);
  });
});

describe('guardrail CLI', () => {
  it('returns zero for a passing requested lane', (t) => {
    const fixture = makeCliFixtureDir();
    const outputDir = path.join(fixture.tempDir, 'out-pass');
    const result = runCli(fixture, outputDir, 'promotion');

    t.assert.equal(result.status, 0);
  });

  it('returns non-zero for a blocked requested lane', (t) => {
    const fixture = makeCliFixtureDir({
      mutateReviewedExplanations: (artifact) => {
        artifact.reviewed_explanations[0].review.status = 'rejected';
        artifact.reviewed_explanations[0].review.article_readiness = 'not-ready';
      },
    });
    const outputDir = path.join(fixture.tempDir, 'out-fail');
    const result = runCli(fixture, outputDir, 'article-claim');

    t.assert.equal(result.status, 1);
  });
});

const buildPromotionArtifacts = (
  advisoryPath,
  reviewedPath = '/tmp/reviewed-candidate-rules.json',
  options = {}
) => {
  const advisory = advisoryArtifact();
  options.mutateAdvisory?.(advisory);
  const candidateId = normalizeCandidateRule(advisory.candidate_rules[0]).candidate_id;
  const review = buildRuleReviewWorkflow({
    advisory,
    advisoryPath,
    promotedVersion: 'llm-reviewed-rules-v1',
    reviewInput: reviewInput(candidateId),
    reviewInputPath: '/tmp/review-input.json',
  });
  const reviewedArtifact = review.reviewArtifact;
  options.mutateReviewed?.(reviewedArtifact);
  const checklistArtifact = buildRuleValidationChecklist({
    reviewedArtifact,
    reviewedArtifactPath: reviewedPath,
  });
  options.mutateChecklist?.(checklistArtifact);
  const promotedArtifact = review.promotedArtifact;
  options.mutatePromoted?.(promotedArtifact);
  return {
    advisoryArtifact: advisory,
    advisoryPath,
    checklistArtifact,
    checklistPath: '/tmp/llm-rule-validation-report.json',
    promotedArtifact,
    promotedPath: '/tmp/promoted-fitness-config-v1.json',
    reviewedArtifact,
    reviewedPath,
  };
};

const writePromotionArtifacts = (tempDir) => {
  const advisoryPath = path.join(tempDir, 'candidate-rule-suggestions.json');
  const reviewedPath = path.join(tempDir, 'reviewed-candidate-rules.json');
  const promotedPath = path.join(tempDir, 'promoted-fitness-config-v1.json');
  const checklistPath = path.join(tempDir, 'llm-rule-validation-report.json');
  const artifacts = buildPromotionArtifacts(advisoryPath, reviewedPath);

  fs.writeFileSync(advisoryPath, JSON.stringify(artifacts.advisoryArtifact, null, 2), 'utf-8');
  fs.writeFileSync(reviewedPath, JSON.stringify(artifacts.reviewedArtifact, null, 2), 'utf-8');
  fs.writeFileSync(promotedPath, JSON.stringify(artifacts.promotedArtifact, null, 2), 'utf-8');
  fs.writeFileSync(checklistPath, JSON.stringify(artifacts.checklistArtifact, null, 2), 'utf-8');

  return {
    advisoryPath,
    checklistPath,
    promotedPath,
    reviewedPath,
  };
};

const makeCliFixtureDir = (options = {}) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guardrail-cli-'));
  const repoRoot = path.join(tempDir, 'repo-root');
  fs.mkdirSync(repoRoot, { recursive: true });
  const promotionArtifacts = writePromotionArtifacts(tempDir);
  const report = resultsReport();
  const reviewedExplanations = reviewedExplanationsArtifact();
  options.mutateReviewedExplanations?.(reviewedExplanations);

  fs.writeFileSync(path.join(tempDir, 'results-report.json'), JSON.stringify(report, null, 2), 'utf-8');
  fs.writeFileSync(path.join(tempDir, 'reviewed-tradeoff-explanations.json'), JSON.stringify(reviewedExplanations, null, 2), 'utf-8');
  return {
    ...promotionArtifacts,
    repoRoot,
    tempDir,
  };
};

const runCli = (fixture, outputDir, lane) => {
  const cliPath = path.resolve('load-tests/runtime-scenarios/llm-guardrail-evaluation-cli.mjs');
  return spawnSync(
    process.execPath,
    [
      cliPath,
      '--lane',
      lane,
      '--advisory-json',
      fixture.advisoryPath,
      '--reviewed-json',
      fixture.reviewedPath,
      '--promoted-json',
      fixture.promotedPath,
      '--checklist-json',
      fixture.checklistPath,
      '--results-report-json',
      path.join(fixture.tempDir, 'results-report.json'),
      '--reviewed-explanations-json',
      path.join(fixture.tempDir, 'reviewed-tradeoff-explanations.json'),
      '--repo-root',
      fixture.repoRoot,
      '--output-dir',
      outputDir,
    ],
    { cwd: path.resolve('.'), encoding: 'utf-8' }
  );
};
