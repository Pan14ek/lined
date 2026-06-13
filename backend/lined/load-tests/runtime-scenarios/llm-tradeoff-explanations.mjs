import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const EXPLANATION_SCHEMA_VERSION = 1;
export const EXPLANATION_WORKFLOW_VERSION = 'llm-tradeoff-explanations-v1';
export const DEFAULT_PROVIDER = 'mock';
export const DEFAULT_OPENAI_MODEL = 'gpt-5.5';
const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DRAFT_OUTPUT_FILE = 'tradeoff-explanation-drafts.json';
const REVIEWED_OUTPUT_FILE = 'reviewed-tradeoff-explanations.json';
const PROVIDERS = Object.freeze(['mock', 'openai']);
const REVIEW_STATUSES = Object.freeze(['accepted', 'revise', 'rejected']);
const ARTICLE_READINESS = Object.freeze(['ready', 'limitations-required', 'not-ready']);

export const OUTPUT_SCHEMA = Object.freeze({
  type: 'object',
  properties: {
    explanation_drafts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          explanation_id: { type: 'string' },
          explanation_type: {
            type: 'string',
            enum: ['candidate-tradeoff', 'comparison-summary'],
          },
          candidate_id: { type: 'string' },
          fixed_scalar_top_candidate_id: { type: 'string' },
          title: { type: 'string' },
          summary: { type: 'string' },
          limitations: {
            type: 'array',
            items: { type: 'string' },
          },
          evidence_refs: {
            type: 'array',
            items: { type: 'string' },
          },
          requires_human_review: { type: 'boolean' },
        },
        required: [
          'explanation_id',
          'explanation_type',
          'candidate_id',
          'fixed_scalar_top_candidate_id',
          'title',
          'summary',
          'limitations',
          'evidence_refs',
          'requires_human_review',
        ],
        additionalProperties: false,
      },
    },
    review_notes: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['explanation_drafts', 'review_notes'],
  additionalProperties: false,
});

export const parseTradeoffExplanationArgs = (argv) => {
  const options = {
    model: DEFAULT_OPENAI_MODEL,
    outputDir: undefined,
    provider: DEFAULT_PROVIDER,
    resultsReportJson: undefined,
    reviewInputJson: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      return { ...options, help: true };
    }
    if (arg === '--results-report-json') {
      options.resultsReportJson = readOptionValue(argv, index, arg);
      index += 1;
    } else if (arg === '--review-input-json') {
      options.reviewInputJson = readOptionValue(argv, index, arg);
      index += 1;
    } else if (arg === '--provider') {
      options.provider = readOptionValue(argv, index, arg);
      index += 1;
    } else if (arg === '--model') {
      options.model = readOptionValue(argv, index, arg);
      index += 1;
    } else if (arg === '--output-dir') {
      options.outputDir = readOptionValue(argv, index, arg);
      index += 1;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  validateTradeoffExplanationOptions(options);
  return options;
};

export const printTradeoffExplanationHelp = () => `Usage:
  node load-tests/runtime-scenarios/llm-tradeoff-explanations-cli.mjs [options]

Options:
  --results-report-json <path>  results-report.json input
  --review-input-json <path>    Reviewer decisions for explanation drafts
  --provider <mock|openai>      Drafting provider, default: mock
  --model <name>                OpenAI model for --provider openai
  --output-dir <dir>            Directory for explanation outputs
`;

export const validateTradeoffExplanationOptions = (options) => {
  if (!options.resultsReportJson) {
    throw new Error('--results-report-json is required');
  }
  if (!options.outputDir) {
    throw new Error('--output-dir is required');
  }
  if (!PROVIDERS.includes(options.provider)) {
    throw new Error(`--provider must be one of: ${PROVIDERS.join(', ')}`);
  }
};

export const writeTradeoffExplanationWorkflow = async (options, dependencies = {}) => {
  const resultsReport = readJson(options.resultsReportJson);
  const reviewInput = options.reviewInputJson ? readJson(options.reviewInputJson) : undefined;
  const outputs = await buildTradeoffExplanationWorkflow({
    model: options.model,
    provider: options.provider,
    resultsReport,
    resultsReportPath: options.resultsReportJson,
    reviewInput,
    reviewInputPath: options.reviewInputJson,
  }, dependencies);

  fs.mkdirSync(options.outputDir, { recursive: true });
  const draftPath = path.join(options.outputDir, DRAFT_OUTPUT_FILE);
  fs.writeFileSync(draftPath, JSON.stringify(outputs.draftArtifact, null, 2) + '\n', 'utf-8');
  const written = [draftPath];

  if (outputs.reviewedArtifact) {
    const reviewedPath = path.join(options.outputDir, REVIEWED_OUTPUT_FILE);
    fs.writeFileSync(reviewedPath, JSON.stringify(outputs.reviewedArtifact, null, 2) + '\n', 'utf-8');
    written.push(reviewedPath);
  }

  return {
    draftArtifact: outputs.draftArtifact,
    outputs: written,
    reviewedArtifact: outputs.reviewedArtifact,
  };
};

export const buildTradeoffExplanationWorkflow = async ({
  model,
  provider,
  resultsReport,
  resultsReportPath,
  reviewInput,
  reviewInputPath,
}, dependencies = {}) => {
  validateResultsReport(resultsReport);
  if (reviewInput) {
    validateReviewInput(reviewInput);
  }
  const readiness = assessReadiness(resultsReport);
  const draftContext = buildDraftContext(resultsReport, resultsReportPath, readiness);
  const explanationDrafts = readiness.status === 'insufficient-evidence'
    ? []
    : provider === 'openai'
      ? await buildOpenAiDrafts({ model, resultsReport, draftContext }, dependencies)
      : buildMockDrafts(draftContext);
  const draftArtifact = {
    schema_version: EXPLANATION_SCHEMA_VERSION,
    workflow_version: EXPLANATION_WORKFLOW_VERSION,
    generated_at: new Date().toISOString(),
    model: provider === 'openai' ? model : 'deterministic-mock-v1',
    provider,
    readiness,
    source_artifacts: [{
      artifactType: 'results-report-json',
      path: resultsReportPath,
    }],
    explanation_drafts: explanationDrafts,
    review_notes: reviewNotes(readiness),
  };

  return {
    draftArtifact,
    reviewedArtifact: reviewInput
      ? buildReviewedArtifact({
        draftArtifact,
        reviewInput,
        reviewInputPath,
        resultsReportPath,
      })
      : undefined,
  };
};

export const buildOpenAiRequest = ({ model, draftContext, resultsReport }) => ({
  model,
  input: JSON.stringify({
    contract: {
      scope: 'advisory reviewed explanation drafts only',
      workflow_version: EXPLANATION_WORKFLOW_VERSION,
      required_output_schema: OUTPUT_SCHEMA,
    },
    readiness: draftContext.readiness,
    candidate_targets: draftContext.targets,
    report_limitations: resultsReport.limitations,
    instructions: [
      'Return only JSON matching the supplied schema.',
      'Keep every explanation tied to the supplied candidate and comparison keys.',
      'Do not invent improvements, telemetry, or missing evidence.',
      'Preserve limitations and make the advisory boundary explicit.',
    ],
  }, null, 2),
  text: {
    format: {
      type: 'json_schema',
      name: 'llm_tradeoff_explanations',
      strict: true,
      schema: OUTPUT_SCHEMA,
    },
  },
});

const buildOpenAiDrafts = async ({ model, draftContext, resultsReport }, dependencies) => {
  const apiKey = dependencies.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required for --provider openai');
  }
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const response = await fetchImpl(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildOpenAiRequest({ model, draftContext, resultsReport })),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI Responses API request failed (${response.status}): ${body}`);
  }
  const responseBody = await response.json();
  const parsed = JSON.parse(extractOpenAiOutputText(responseBody));
  return normalizeOpenAiDrafts(parsed.explanation_drafts, draftContext.targets);
};

const buildMockDrafts = (draftContext) => draftContext.targets.map((target) => {
  const improvement = listPhrase(target.betterThanScalarTop);
  const sacrifice = listPhrase(target.worseThanScalarTop);
  const limitations = target.limitations;
  if (target.explanationType === 'comparison-summary') {
    return {
      candidate_id: '',
      evidence_refs: target.evidenceRefs,
      explanation_id: target.explanationId,
      explanation_type: target.explanationType,
      fixed_scalar_top_candidate_id: target.fixedScalarTopCandidateId,
      limitations,
      requires_human_review: true,
      summary: `${target.usefulnessClassification === 'single-best-only'
        ? `The scalar top candidate ${target.fixedScalarTopCandidateId} remains the only supported choice in the supplied Pareto comparison.`
        : 'The supplied results report does not provide a distinct Pareto trade-off alternative beyond the scalar comparator.'}`
        + limitSentence(limitations),
      title: `Comparison summary for ${target.fixedScalarTopCandidateId || 'candidate set'}`,
    };
  }
  return {
    candidate_id: target.candidateId,
    evidence_refs: target.evidenceRefs,
    explanation_id: target.explanationId,
    explanation_type: target.explanationType,
    fixed_scalar_top_candidate_id: target.fixedScalarTopCandidateId,
    limitations,
    requires_human_review: true,
    summary: `${target.candidateId} is a confirmed Pareto-selected trade-off relative to scalar top `
      + `${target.fixedScalarTopCandidateId}. `
      + `${improvement !== '' ? `It improves ${improvement}. ` : ''}`
      + `${sacrifice !== '' ? `It sacrifices ${sacrifice}. ` : ''}`
      + `${target.rationale}`.trim()
      + limitSentence(limitations),
    title: `Trade-off draft for ${target.candidateId}`,
  };
});

const buildReviewedArtifact = ({
  draftArtifact,
  reviewInput,
  reviewInputPath,
  resultsReportPath,
}) => {
  const drafts = draftArtifact.explanation_drafts;
  const decisions = reviewInput.decisions ?? [];
  const draftIds = new Set(drafts.map((draft) => draft.explanation_id));
  const decisionMap = new Map();
  for (const decision of decisions) {
    const explanationId = String(decision.explanation_id);
    if (decisionMap.has(explanationId)) {
      throw new Error(`Duplicate review decision for explanation ID: ${explanationId}`);
    }
    if (!draftIds.has(explanationId)) {
      throw new Error(`Review decision references unknown explanation ID: ${explanationId}`);
    }
    decisionMap.set(explanationId, decision);
  }
  const missing = drafts
    .map((draft) => draft.explanation_id)
    .filter((explanationId) => !decisionMap.has(explanationId));
  if (missing.length > 0) {
    throw new Error(`Missing review decisions for explanation IDs: ${missing.join(', ')}`);
  }
  const reviewSummary = {
    accepted: 0,
    rejected: 0,
    revise: 0,
  };
  const reviewedExplanations = drafts.map((draft) => {
    const allowedSourceArtifacts = new Set([resultsReportPath, ...draft.evidence_refs]);
    const decision = normalizeDecision(
      decisionMap.get(draft.explanation_id),
      allowedSourceArtifacts
    );
    reviewSummary[decision.status] += 1;
    return {
      ...draft,
      review: {
        article_readiness: decision.article_readiness,
        rationale: decision.rationale,
        reason_codes: decision.reason_codes,
        referenced_source_artifacts: decision.referenced_source_artifacts,
        status: decision.status,
      },
    };
  });
  return {
    schema_version: EXPLANATION_SCHEMA_VERSION,
    workflow_version: EXPLANATION_WORKFLOW_VERSION,
    review_generated_at: new Date().toISOString(),
    readiness: draftArtifact.readiness,
    source_artifacts: [{
      artifactType: 'results-report-json',
      path: resultsReportPath,
    }, {
      artifactType: 'review-input-json',
      path: reviewInputPath ?? '',
    }],
    reviewer: {
      name: reviewInput.reviewer?.name,
      reviewed_at: reviewInput.reviewed_at ?? draftArtifact.generated_at,
      role: reviewInput.reviewer?.role ?? '',
    },
    review_summary: reviewSummary,
    reviewed_explanations: reviewedExplanations,
  };
};

const buildDraftContext = (resultsReport, resultsReportPath, readiness) => {
  const decisionRows = Array.isArray(resultsReport.tables?.decisionUsefulness)
    ? resultsReport.tables.decisionUsefulness
    : [];
  const paretoRows = Array.isArray(resultsReport.tables?.paretoCandidates)
    ? resultsReport.tables.paretoCandidates
    : [];
  const paretoByCandidate = new Map(
    paretoRows
      .filter((row) => typeof row.candidateId === 'string' && row.candidateId !== '')
      .map((row) => [row.candidateId, row])
  );
  const targets = [];

  for (const row of decisionRows) {
    const usefulnessClassification = String(row.usefulnessClassification ?? '');
    const fixedScalarTopCandidateId = String(row.fixedScalarTopCandidateId ?? '');
    const candidateId = String(row.candidateId ?? '');
    const limitations = sharedLimitations(readiness);
    if (candidateId !== '') {
      const pareto = paretoByCandidate.get(candidateId);
      targets.push({
        betterThanScalarTop: splitList(row.betterThanScalarTop),
        candidateId,
        evidenceRefs: buildEvidenceRefs({
          candidateId,
          fixedScalarTopCandidateId,
          limitations,
          pareto,
          resultsReportPath,
        }),
        explanationId: stableId([
          candidateId,
          fixedScalarTopCandidateId,
          usefulnessClassification,
          row.rationale ?? '',
        ]),
        explanationType: 'candidate-tradeoff',
        fixedScalarRank: String(row.fixedScalarRank ?? ''),
        fixedScalarTopCandidateId,
        limitations,
        paretoRank: String(row.paretoRank ?? ''),
        rationale: String(row.rationale ?? ''),
        usefulnessClassification,
        worseThanScalarTop: splitList(row.worseThanScalarTop),
      });
      continue;
    }
    if (usefulnessClassification !== '' || fixedScalarTopCandidateId !== '') {
      targets.push({
        betterThanScalarTop: [],
        candidateId: '',
        evidenceRefs: buildEvidenceRefs({
          candidateId: '',
          fixedScalarTopCandidateId,
          limitations,
          pareto: undefined,
          resultsReportPath,
        }),
        explanationId: stableId([
          usefulnessClassification,
          fixedScalarTopCandidateId,
          row.rationale ?? '',
        ]),
        explanationType: 'comparison-summary',
        fixedScalarRank: '',
        fixedScalarTopCandidateId,
        limitations,
        paretoRank: '',
        rationale: String(row.rationale ?? ''),
        usefulnessClassification,
        worseThanScalarTop: [],
      });
    }
  }

  return {
    readiness,
    targets,
  };
};

const assessReadiness = (resultsReport) => {
  const limitations = resultsReport.limitations ?? {};
  const reasons = [];
  if (resultsReport.canonicalComparison?.status !== 'available') {
    reasons.push(...(limitations.canonicalComparisonReasons ?? ['canonical-comparison-unavailable']));
  }
  const decisionRows = Array.isArray(resultsReport.tables?.decisionUsefulness)
    ? resultsReport.tables.decisionUsefulness
    : [];
  const paretoRows = Array.isArray(resultsReport.tables?.paretoCandidates)
    ? resultsReport.tables.paretoCandidates
    : [];
  const paretoByCandidate = new Map(
    paretoRows
      .filter((row) => typeof row.candidateId === 'string' && row.candidateId !== '')
      .map((row) => [row.candidateId, row])
  );
  if (decisionRows.length === 0) {
    reasons.push('missing-decision-usefulness-rows');
  }
  const candidateRows = decisionRows.filter((row) => String(row.candidateId ?? '') !== '');
  const summaryRows = decisionRows.filter((row) => String(row.candidateId ?? '') === '');
  if (candidateRows.length === 0 && summaryRows.length === 0) {
    reasons.push('missing-comparison-targets');
  }
  candidateRows.forEach((row) => {
    const candidateId = String(row.candidateId ?? '');
    const pareto = paretoByCandidate.get(candidateId);
    if (!pareto || String(pareto.selected ?? '') !== 'true') {
      reasons.push(`missing-selected-pareto-candidate:${candidateId}`);
    }
  });

  const severity = resultsReport.canonicalComparison?.status !== 'available'
    || reasons.includes('missing-decision-usefulness-rows')
    || reasons.includes('missing-comparison-targets')
    || reasons.some((reason) => reason.startsWith('missing-selected-pareto-candidate:'))
    ? 'insufficient-evidence'
    : ((limitations.excludedEvidenceCount ?? 0) > 0
      || (limitations.missingRuntimeMetrics ?? []).length > 0
      || (limitations.omittedObjectives ?? []).length > 0)
      ? 'limitations-required'
      : 'ready';

  return {
    excluded_evidence_reasons: limitations.excludedEvidenceReasons ?? [],
    missing_runtime_metrics: limitations.missingRuntimeMetrics ?? [],
    omitted_objectives: limitations.omittedObjectives ?? [],
    reasons,
    status: severity,
  };
};

const sharedLimitations = (readiness) => {
  const messages = [];
  if (readiness.status === 'limitations-required') {
    if (readiness.missing_runtime_metrics.length > 0) {
      messages.push(`Missing runtime metrics: ${readiness.missing_runtime_metrics.join(', ')}`);
    }
    if (readiness.omitted_objectives.length > 0) {
      messages.push(`Omitted objectives: ${readiness.omitted_objectives.join(', ')}`);
    }
    if (readiness.excluded_evidence_reasons.length > 0) {
      messages.push(`Excluded evidence reasons: ${readiness.excluded_evidence_reasons.join(', ')}`);
    }
  }
  if (readiness.status === 'insufficient-evidence') {
    messages.push(`Drafting refused because: ${readiness.reasons.join(', ')}`);
  }
  return messages;
};

const validateResultsReport = (resultsReport) => {
  if (!isRecord(resultsReport)) {
    throw new Error('results-report.json must be an object');
  }
  if (!isRecord(resultsReport.canonicalComparison)) {
    throw new Error('results-report.json must include canonicalComparison');
  }
  if (!isRecord(resultsReport.tables)) {
    throw new Error('results-report.json must include tables');
  }
  if (!Array.isArray(resultsReport.tables.decisionUsefulness)) {
    throw new Error('results-report.json must include tables.decisionUsefulness');
  }
  if (!isRecord(resultsReport.limitations)) {
    throw new Error('results-report.json must include limitations');
  }
};

const validateReviewInput = (reviewInput) => {
  if (!isRecord(reviewInput)) {
    throw new Error('Review input must be an object');
  }
  if (!isRecord(reviewInput.reviewer) || !reviewInput.reviewer.name) {
    throw new Error('Review input must include reviewer.name');
  }
  if (!Array.isArray(reviewInput.decisions)) {
    throw new Error('Review input must include a decisions array');
  }
};

const normalizeDecision = (decision, allowedSourceArtifacts) => {
  if (!REVIEW_STATUSES.includes(decision.status)) {
    throw new Error(`Unsupported explanation review status: ${decision.status}`);
  }
  if (!ARTICLE_READINESS.includes(decision.article_readiness)) {
    throw new Error(`Unsupported article readiness: ${decision.article_readiness}`);
  }
  const reasonCodes = normalizeStringList(decision.reason_codes);
  const artifacts = normalizeStringList(decision.referenced_source_artifacts);
  const rationale = String(decision.rationale ?? '').trim();
  if (rationale === '') {
    throw new Error(`Review decision for ${decision.explanation_id} must include rationale`);
  }
  if (reasonCodes.length === 0) {
    throw new Error(`Review decision for ${decision.explanation_id} must include reason_codes`);
  }
  if (artifacts.length === 0) {
    throw new Error(`Review decision for ${decision.explanation_id} must include referenced_source_artifacts`);
  }
  if (!artifacts.every((artifact) => allowedSourceArtifacts.has(artifact))) {
    throw new Error(
      `Review decision for ${decision.explanation_id} referenced artifacts outside the results-report boundary`
    );
  }
  return {
    article_readiness: decision.article_readiness,
    explanation_id: String(decision.explanation_id),
    rationale,
    reason_codes: reasonCodes,
    referenced_source_artifacts: artifacts,
    status: decision.status,
  };
};

const normalizeOpenAiDrafts = (drafts, targets) => {
  if (!Array.isArray(drafts)) {
    throw new Error('OpenAI explanation_drafts must be an array');
  }
  const targetMap = new Map(targets.map((target) => [target.explanationId, target]));
  return drafts.map((draft) => {
    const target = targetMap.get(String(draft.explanation_id));
    if (!target) {
      throw new Error(`OpenAI draft referenced unknown explanation_id: ${draft.explanation_id}`);
    }
    if (Object.hasOwn(draft, 'candidate_id') && String(draft.candidate_id) !== target.candidateId) {
      throw new Error(`OpenAI draft changed candidate_id for ${draft.explanation_id}`);
    }
    if (
      Object.hasOwn(draft, 'fixed_scalar_top_candidate_id')
      && String(draft.fixed_scalar_top_candidate_id) !== target.fixedScalarTopCandidateId
    ) {
      throw new Error(`OpenAI draft changed fixed_scalar_top_candidate_id for ${draft.explanation_id}`);
    }
    if (
      Object.hasOwn(draft, 'explanation_type')
      && String(draft.explanation_type) !== target.explanationType
    ) {
      throw new Error(`OpenAI draft changed explanation_type for ${draft.explanation_id}`);
    }
    if (
      Array.isArray(draft.evidence_refs)
      && !draft.evidence_refs.every((entry) => target.evidenceRefs.includes(String(entry)))
    ) {
      throw new Error(`OpenAI draft changed evidence_refs for ${draft.explanation_id}`);
    }
    if (draft.requires_human_review === false) {
      throw new Error(`OpenAI draft changed requires_human_review for ${draft.explanation_id}`);
    }
    return {
      candidate_id: target.candidateId,
      evidence_refs: target.evidenceRefs,
      explanation_id: String(draft.explanation_id),
      explanation_type: target.explanationType,
      fixed_scalar_top_candidate_id: target.fixedScalarTopCandidateId,
      limitations: target.limitations,
      requires_human_review: true,
      summary: String(draft.summary),
      title: String(draft.title),
    };
  });
};

const buildEvidenceRefs = ({
  candidateId,
  fixedScalarTopCandidateId,
  limitations,
  pareto,
  resultsReportPath,
}) => {
  const refs = [
    `results-report:${resultsReportPath}`,
  ];
  if (candidateId !== '') {
    refs.push(`decision-candidate:${candidateId}`);
  }
  if (fixedScalarTopCandidateId !== '') {
    refs.push(`scalar-top:${fixedScalarTopCandidateId}`);
  }
  if (pareto?.rank !== undefined && pareto?.rank !== '') {
    refs.push(`pareto-rank:${candidateId}:${pareto.rank}`);
  }
  limitations.forEach((limitation) => refs.push(`limitation:${limitation}`));
  return refs;
};

const reviewNotes = (readiness) => {
  if (readiness.status === 'insufficient-evidence') {
    return [
      'No explanation drafts were generated because the supplied results report is not safe for trade-off claims.',
      `Blocking reasons: ${readiness.reasons.join(', ')}`,
    ];
  }
  return [
    'Explanation drafts are advisory only and require human review before article use.',
    'Each draft is tied to results-report comparison keys and must preserve limitations rather than smoothing them away.',
    readiness.status === 'limitations-required'
      ? 'The supplied report contains limitations or exclusions; review must keep those caveats in any accepted explanation.'
      : 'The supplied report is complete enough for draft generation, but review is still required before article use.',
  ];
};

const extractOpenAiOutputText = (responseBody) => {
  if (typeof responseBody?.output_text === 'string' && responseBody.output_text.trim() !== '') {
    return responseBody.output_text;
  }
  const fragments = [];
  for (const outputItem of responseBody?.output ?? []) {
    for (const contentItem of outputItem?.content ?? []) {
      if (typeof contentItem?.text === 'string' && contentItem.text.trim() !== '') {
        fragments.push(contentItem.text);
      }
    }
  }
  if (fragments.length > 0) {
    return fragments.join('\n');
  }
  throw new Error('OpenAI response did not contain output_text');
};

const readJson = (sourcePath) => JSON.parse(fs.readFileSync(sourcePath, 'utf-8'));

const readOptionValue = (argv, index, arg) => {
  const value = argv[index + 1];
  if (!value) {
    throw new Error(`Missing value for ${arg}`);
  }
  return value;
};

const stableId = (parts) => {
  const value = parts.join('|');
  const digest = crypto.createHash('sha256').update(value).digest('hex').slice(0, 12);
  const slug = parts
    .slice(0, 2)
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return `${slug}-${digest}`;
};

const normalizeStringList = (value, fallback = []) => {
  if (!Array.isArray(value)) {
    return fallback;
  }
  return value.map((item) => String(item)).filter((item) => item !== '');
};

const splitList = (value) => String(value ?? '')
  .split('|')
  .map((item) => item.trim())
  .filter((item) => item !== '');

const listPhrase = (items) => {
  if (items.length === 0) {
    return '';
  }
  if (items.length === 1) {
    return items[0];
  }
  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }
  return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`;
};

const limitSentence = (limitations) => limitations.length > 0
  ? ` Limitations remain explicit: ${limitations.join('; ')}.`
  : '';

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
