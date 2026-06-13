import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  buildOpenAiRequest,
  buildTradeoffExplanationWorkflow,
  parseTradeoffExplanationArgs,
  writeTradeoffExplanationWorkflow,
} from './llm-tradeoff-explanations.mjs';

const resultsReport = (overrides = {}) => ({
  canonicalComparison: {
    reasons: overrides.canonicalReasons ?? [],
    status: overrides.canonicalStatus ?? 'available',
  },
  limitations: {
    canonicalComparisonReasons: overrides.canonicalReasons ?? [],
    canonicalComparisonStatus: overrides.canonicalStatus ?? 'available',
    excludedEvidenceCount: overrides.excludedEvidenceCount ?? 0,
    excludedEvidenceReasons: overrides.excludedEvidenceReasons ?? [],
    missingRuntimeMetrics: overrides.missingRuntimeMetrics ?? [],
    omittedObjectives: overrides.omittedObjectives ?? [],
  },
  tables: {
    decisionUsefulness: overrides.decisionRows ?? [{
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
    paretoCandidates: overrides.paretoRows ?? [{
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

const reviewInput = {
  reviewer: {
    name: 'Research Reviewer',
    role: 'architect',
  },
  reviewed_at: '2026-06-13T12:00:00.000Z',
  decisions: [],
};

describe('parseTradeoffExplanationArgs', () => {
  it('accepts results report, provider, review input, and output directory', (t) => {
    t.plan(4);
    const options = parseTradeoffExplanationArgs([
      '--results-report-json',
      'results-report.json',
      '--review-input-json',
      'review-input.json',
      '--provider',
      'openai',
      '--model',
      'gpt-5.5',
      '--output-dir',
      'out',
    ]);

    t.assert.equal(options.resultsReportJson, 'results-report.json');
    t.assert.equal(options.reviewInputJson, 'review-input.json');
    t.assert.equal(options.provider, 'openai');
    t.assert.equal(options.outputDir, 'out');
  });

  it('rejects missing required inputs', (t) => {
    t.plan(2);
    t.assert.throws(
      () => parseTradeoffExplanationArgs(['--output-dir', 'out']),
      /--results-report-json is required/
    );
    t.assert.throws(
      () => parseTradeoffExplanationArgs(['--results-report-json', 'results-report.json']),
      /--output-dir is required/
    );
  });
});

describe('buildTradeoffExplanationWorkflow', () => {
  it('builds candidate-level drafts tied to concrete comparison targets', async (t) => {
    t.plan(9);
    const workflow = await buildTradeoffExplanationWorkflow({
      model: 'gpt-5.5',
      provider: 'mock',
      resultsReport: resultsReport(),
      resultsReportPath: '/tmp/results-report.json',
      reviewInput: undefined,
      reviewInputPath: undefined,
    });
    const draft = workflow.draftArtifact.explanation_drafts[0];

    t.assert.equal(workflow.draftArtifact.readiness.status, 'ready');
    t.assert.equal(workflow.draftArtifact.explanation_drafts.length, 1);
    t.assert.equal(draft.explanation_type, 'candidate-tradeoff');
    t.assert.equal(draft.candidate_id, 'replicas-2:baseline:local-kind');
    t.assert.equal(draft.fixed_scalar_top_candidate_id, 'fixed-medium:baseline:local-kind');
    t.assert.match(draft.summary, /Pareto-selected/);
    t.assert.match(draft.summary, /cpu_utilization/);
    t.assert.match(draft.summary, /latency_p95_ms/);
    t.assert.equal(draft.evidence_refs.includes('decision-candidate:replicas-2:baseline:local-kind'), true);
  });

  it('refuses drafting when the canonical comparison is incomplete', async (t) => {
    t.plan(4);
    const workflow = await buildTradeoffExplanationWorkflow({
      model: 'gpt-5.5',
      provider: 'mock',
      resultsReport: resultsReport({
        canonicalReasons: ['missing-hpa-cpu'],
        canonicalStatus: 'incomplete',
      }),
      resultsReportPath: '/tmp/results-report.json',
      reviewInput: undefined,
      reviewInputPath: undefined,
    });

    t.assert.equal(workflow.draftArtifact.readiness.status, 'insufficient-evidence');
    t.assert.equal(workflow.draftArtifact.explanation_drafts.length, 0);
    t.assert.match(workflow.draftArtifact.review_notes[0], /No explanation drafts were generated/);
    t.assert.equal(workflow.draftArtifact.readiness.reasons.includes('missing-hpa-cpu'), true);
  });

  it('downgrades drafts when exclusions or missing metrics remain', async (t) => {
    t.plan(5);
    const workflow = await buildTradeoffExplanationWorkflow({
      model: 'gpt-5.5',
      provider: 'mock',
      resultsReport: resultsReport({
        excludedEvidenceCount: 1,
        excludedEvidenceReasons: ['manifest-only-failed-or-incomplete-run'],
        missingRuntimeMetrics: ['availability'],
      }),
      resultsReportPath: '/tmp/results-report.json',
      reviewInput: undefined,
      reviewInputPath: undefined,
    });
    const draft = workflow.draftArtifact.explanation_drafts[0];

    t.assert.equal(workflow.draftArtifact.readiness.status, 'limitations-required');
    t.assert.equal(draft.limitations.includes('Missing runtime metrics: availability'), true);
    t.assert.equal(
      draft.limitations.includes('Excluded evidence reasons: manifest-only-failed-or-incomplete-run'),
      true
    );
    t.assert.match(draft.summary, /Limitations remain explicit/);
    t.assert.equal(draft.evidence_refs.some((value) => value.includes('limitation:Missing runtime metrics')), true);
  });

  it('refuses drafting when a decision row lacks a selected Pareto candidate', async (t) => {
    t.plan(4);
    const workflow = await buildTradeoffExplanationWorkflow({
      model: 'gpt-5.5',
      provider: 'mock',
      resultsReport: resultsReport({
        paretoRows: [],
      }),
      resultsReportPath: '/tmp/results-report.json',
      reviewInput: undefined,
      reviewInputPath: undefined,
    });

    t.assert.equal(workflow.draftArtifact.readiness.status, 'insufficient-evidence');
    t.assert.equal(workflow.draftArtifact.explanation_drafts.length, 0);
    t.assert.equal(
      workflow.draftArtifact.readiness.reasons.includes(
        'missing-selected-pareto-candidate:replicas-2:baseline:local-kind'
      ),
      true
    );
    t.assert.match(workflow.draftArtifact.review_notes[1], /missing-selected-pareto-candidate/);
  });

  it('writes a reviewed explanation artifact when review input is supplied', async (t) => {
    t.plan(6);
    const draftOnly = await buildTradeoffExplanationWorkflow({
      model: 'gpt-5.5',
      provider: 'mock',
      resultsReport: resultsReport(),
      resultsReportPath: '/tmp/results-report.json',
      reviewInput: undefined,
      reviewInputPath: undefined,
    });
    const explanationId = draftOnly.draftArtifact.explanation_drafts[0].explanation_id;
    const workflow = await buildTradeoffExplanationWorkflow({
      model: 'gpt-5.5',
      provider: 'mock',
      resultsReport: resultsReport(),
      resultsReportPath: '/tmp/results-report.json',
      reviewInput: {
        ...reviewInput,
        decisions: [{
          article_readiness: 'ready',
          explanation_id: explanationId,
          rationale: 'Grounded in the supplied decision-usefulness row.',
          reason_codes: ['telemetry-linked', 'pareto-traceable'],
          referenced_source_artifacts: ['/tmp/results-report.json'],
          status: 'accepted',
        }],
      },
      reviewInputPath: '/tmp/review-input.json',
    });

    t.assert.equal(workflow.reviewedArtifact.reviewed_explanations.length, 1);
    t.assert.equal(workflow.reviewedArtifact.review_summary.accepted, 1);
    t.assert.equal(
      workflow.reviewedArtifact.reviewed_explanations[0].review.status,
      'accepted'
    );
    t.assert.equal(
      workflow.reviewedArtifact.reviewed_explanations[0].review.article_readiness,
      'ready'
    );
    t.assert.equal(workflow.reviewedArtifact.reviewer.name, 'Research Reviewer');
    t.assert.equal(
      workflow.reviewedArtifact.source_artifacts[1].artifactType,
      'review-input-json'
    );
  });

  it('rejects review input that cites artifacts outside the results-report boundary', async (t) => {
    t.plan(1);
    const draftOnly = await buildTradeoffExplanationWorkflow({
      model: 'gpt-5.5',
      provider: 'mock',
      resultsReport: resultsReport(),
      resultsReportPath: '/tmp/results-report.json',
      reviewInput: undefined,
      reviewInputPath: undefined,
    });
    await t.assert.rejects(
      () => buildTradeoffExplanationWorkflow({
        model: 'gpt-5.5',
        provider: 'mock',
        resultsReport: resultsReport(),
        resultsReportPath: '/tmp/results-report.json',
        reviewInput: {
          ...reviewInput,
          decisions: [{
            article_readiness: 'ready',
            explanation_id: draftOnly.draftArtifact.explanation_drafts[0].explanation_id,
            rationale: 'Looks acceptable.',
            reason_codes: ['reviewed'],
            referenced_source_artifacts: ['/tmp/not-results-report.json'],
            status: 'accepted',
          }],
        },
        reviewInputPath: '/tmp/review-input.json',
      }),
      /outside the results-report boundary/
    );
  });

  it('builds a structured OpenAI request around explicit comparison targets', (t) => {
    t.plan(3);
    const request = buildOpenAiRequest({
      model: 'gpt-5.5',
      draftContext: {
        readiness: {
          reasons: [],
          status: 'ready',
        },
        targets: [{
          betterThanScalarTop: ['cpu_utilization'],
          candidateId: 'replicas-2:baseline:local-kind',
          evidenceRefs: ['decision-candidate:replicas-2:baseline:local-kind'],
          explanationId: 'replicas-2-fixed-medium-abc',
          explanationType: 'candidate-tradeoff',
          fixedScalarTopCandidateId: 'fixed-medium:baseline:local-kind',
          limitations: [],
          rationale: 'Improves cpu_utilization while sacrificing latency_p95_ms.',
          usefulnessClassification: 'multiple-tradeoff-alternatives',
          worseThanScalarTop: ['latency_p95_ms'],
        }],
      },
      resultsReport: resultsReport(),
    });

    t.assert.equal(request.text.format.name, 'llm_tradeoff_explanations');
    t.assert.equal(request.text.format.strict, true);
    t.assert.match(request.input, /replicas-2:baseline:local-kind/);
  });

  it('rejects OpenAI output that changes comparison identifiers or evidence refs', async (t) => {
    t.plan(3);
    const draftOnly = await buildTradeoffExplanationWorkflow({
      model: 'gpt-5.5',
      provider: 'mock',
      resultsReport: resultsReport(),
      resultsReportPath: '/tmp/results-report.json',
      reviewInput: undefined,
      reviewInputPath: undefined,
    });
    const explanationId = draftOnly.draftArtifact.explanation_drafts[0].explanation_id;
    await t.assert.rejects(
      () => buildTradeoffExplanationWorkflow({
        model: 'gpt-5.5',
        provider: 'openai',
        resultsReport: resultsReport(),
        resultsReportPath: '/tmp/results-report.json',
        reviewInput: undefined,
        reviewInputPath: undefined,
      }, {
        apiKey: 'test',
        fetchImpl: async () => ({
          ok: true,
          json: async () => ({
            output_text: JSON.stringify({
              explanation_drafts: [{
                candidate_id: 'invented:baseline:local-kind',
                evidence_refs: ['results-report:/tmp/other-report.json'],
                explanation_id: explanationId,
                explanation_type: 'candidate-tradeoff',
                fixed_scalar_top_candidate_id: 'other-top:baseline:local-kind',
                limitations: [],
                requires_human_review: true,
                summary: 'Invented draft.',
                title: 'Invented title',
              }],
              review_notes: [],
            }),
          }),
        }),
      }),
      /changed candidate_id/
    );
    await t.assert.rejects(
      () => buildTradeoffExplanationWorkflow({
        model: 'gpt-5.5',
        provider: 'openai',
        resultsReport: resultsReport(),
        resultsReportPath: '/tmp/results-report.json',
        reviewInput: undefined,
        reviewInputPath: undefined,
      }, {
        apiKey: 'test',
        fetchImpl: async () => ({
          ok: true,
          json: async () => ({
            output_text: JSON.stringify({
              explanation_drafts: [{
                candidate_id: 'replicas-2:baseline:local-kind',
                evidence_refs: ['results-report:/tmp/other-report.json'],
                explanation_id: explanationId,
                explanation_type: 'candidate-tradeoff',
                fixed_scalar_top_candidate_id: 'fixed-medium:baseline:local-kind',
                limitations: [],
                requires_human_review: true,
                summary: 'Invented draft.',
                title: 'Invented title',
              }],
              review_notes: [],
            }),
          }),
        }),
      }),
      /changed evidence_refs/
    );
    await t.assert.rejects(
      () => buildTradeoffExplanationWorkflow({
        model: 'gpt-5.5',
        provider: 'openai',
        resultsReport: resultsReport(),
        resultsReportPath: '/tmp/results-report.json',
        reviewInput: undefined,
        reviewInputPath: undefined,
      }, {
        apiKey: 'test',
        fetchImpl: async () => ({
          ok: true,
          json: async () => ({
            output_text: JSON.stringify({
              explanation_drafts: [{
                candidate_id: 'replicas-2:baseline:local-kind',
                evidence_refs: ['results-report:/tmp/results-report.json'],
                explanation_id: explanationId,
                explanation_type: 'candidate-tradeoff',
                fixed_scalar_top_candidate_id: 'fixed-medium:baseline:local-kind',
                limitations: [],
                requires_human_review: false,
                summary: 'Invented draft.',
                title: 'Invented title',
              }],
              review_notes: [],
            }),
          }),
        }),
      }),
      /changed requires_human_review/
    );
  });
});

describe('writeTradeoffExplanationWorkflow', () => {
  it('writes draft and reviewed artifacts to disk', async (t) => {
    t.plan(5);
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lined-tradeoff-explanations-'));
    const resultsPath = path.join(directory, 'results-report.json');
    const reviewPath = path.join(directory, 'review-input.json');
    const outputDir = path.join(directory, 'out');
    fs.writeFileSync(resultsPath, JSON.stringify(resultsReport(), null, 2), 'utf-8');
    const draftOnly = await buildTradeoffExplanationWorkflow({
      model: 'gpt-5.5',
      provider: 'mock',
      resultsReport: resultsReport(),
      resultsReportPath: resultsPath,
      reviewInput: undefined,
      reviewInputPath: undefined,
    });
    fs.writeFileSync(reviewPath, JSON.stringify({
      ...reviewInput,
      decisions: [{
        article_readiness: 'limitations-required',
        explanation_id: draftOnly.draftArtifact.explanation_drafts[0].explanation_id,
        rationale: 'Usable, but the article text must retain the evidence boundary.',
        reason_codes: ['reviewed', 'limitations-carried'],
        referenced_source_artifacts: [resultsPath],
        status: 'accepted',
      }],
    }, null, 2), 'utf-8');

    try {
      const result = await writeTradeoffExplanationWorkflow({
        model: 'gpt-5.5',
        outputDir,
        provider: 'mock',
        resultsReportJson: resultsPath,
        reviewInputJson: reviewPath,
      });

      t.assert.equal(result.outputs.length, 2);
      t.assert.equal(fs.existsSync(path.join(outputDir, 'tradeoff-explanation-drafts.json')), true);
      t.assert.equal(fs.existsSync(path.join(outputDir, 'reviewed-tradeoff-explanations.json')), true);
      const reviewed = JSON.parse(
        fs.readFileSync(path.join(outputDir, 'reviewed-tradeoff-explanations.json'), 'utf-8')
      );
      t.assert.equal(reviewed.review_summary.accepted, 1);
      t.assert.equal(reviewed.reviewed_explanations[0].review.article_readiness, 'limitations-required');
    } finally {
      fs.rmSync(directory, { force: true, recursive: true });
    }
  });
});
