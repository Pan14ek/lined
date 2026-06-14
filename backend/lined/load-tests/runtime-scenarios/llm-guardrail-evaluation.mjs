import fs from 'node:fs';
import path from 'node:path';

import { normalizeCandidateRule } from './llm-rule-review-workflow.mjs';

export const GUARDRAIL_SCHEMA_VERSION = 1;
export const GUARDRAIL_WORKFLOW_VERSION = 'llm-guardrail-evaluation-v1';
export const DEFAULT_LANE = 'all';

const OUTPUT_FILE = 'llm-guardrail-report.json';
const LANES = Object.freeze(['promotion', 'article-claim', 'all']);
const ARTICLE_READY_STATES = new Set(['ready', 'limitations-required']);
const ALLOWED_PROMOTION_LANES = new Set(['objective', 'constraint', 'context']);
const REPO_SCAN_EXTENSIONS = new Set([
  '.gradle',
  '.java',
  '.js',
  '.json',
  '.kts',
  '.mjs',
  '.py',
  '.sh',
  '.ts',
  '.tsx',
  '.yaml',
  '.yml',
]);
const REPO_SCAN_EXCLUDED_DIRS = new Set([
  '.git',
  'build',
  'docs',
  'node_modules',
  'out',
]);
const REPO_SCAN_ALLOWED_SEGMENTS = [
  `${path.sep}load-tests${path.sep}runtime-scenarios${path.sep}llm-`,
];
const MONOREPO_SCAN_DIRS = Object.freeze([
  'fitness-metrics-collector',
  'fitness-metrics-analyzer',
]);

export const parseGuardrailArgs = (argv) => {
  const options = {
    advisoryJson: undefined,
    checklistJson: undefined,
    lane: DEFAULT_LANE,
    outputDir: undefined,
    promotedJson: undefined,
    repoRoot: process.cwd(),
    resultsReportJson: undefined,
    reviewedExplanationsJson: undefined,
    reviewedJson: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      return { ...options, help: true };
    }
    if (arg === '--lane') {
      options.lane = readOptionValue(argv, index, arg);
      index += 1;
    } else if (arg === '--advisory-json') {
      options.advisoryJson = readOptionValue(argv, index, arg);
      index += 1;
    } else if (arg === '--reviewed-json') {
      options.reviewedJson = readOptionValue(argv, index, arg);
      index += 1;
    } else if (arg === '--promoted-json') {
      options.promotedJson = readOptionValue(argv, index, arg);
      index += 1;
    } else if (arg === '--checklist-json') {
      options.checklistJson = readOptionValue(argv, index, arg);
      index += 1;
    } else if (arg === '--results-report-json') {
      options.resultsReportJson = readOptionValue(argv, index, arg);
      index += 1;
    } else if (arg === '--reviewed-explanations-json') {
      options.reviewedExplanationsJson = readOptionValue(argv, index, arg);
      index += 1;
    } else if (arg === '--repo-root') {
      options.repoRoot = readOptionValue(argv, index, arg);
      index += 1;
    } else if (arg === '--output-dir') {
      options.outputDir = readOptionValue(argv, index, arg);
      index += 1;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  validateGuardrailOptions(options);
  return options;
};

export const printGuardrailHelp = () => `Usage:
  node load-tests/runtime-scenarios/llm-guardrail-evaluation-cli.mjs [options]

Options:
  --lane <promotion|article-claim|all>  Lane to enforce, default: all
  --advisory-json <path>                candidate-rule-suggestions.json input
  --reviewed-json <path>                reviewed-candidate-rules.json input
  --promoted-json <path>                promoted-fitness-config-v1.json input
  --checklist-json <path>               llm-rule-validation-report.json input
  --results-report-json <path>          results-report.json input
  --reviewed-explanations-json <path>   reviewed-tradeoff-explanations.json input
  --repo-root <path>                    Repo root for bounded consumer inspection
  --output-dir <dir>                    Directory for guardrail output
`;

export const validateGuardrailOptions = (options) => {
  if (!LANES.includes(options.lane)) {
    throw new Error(`--lane must be one of: ${LANES.join(', ')}`);
  }
  if (!options.outputDir) {
    throw new Error('--output-dir is required');
  }

  const needsPromotion = options.lane === 'promotion' || options.lane === 'all';
  if (needsPromotion) {
    for (const field of ['advisoryJson', 'reviewedJson', 'promotedJson', 'checklistJson']) {
      if (!options[field]) {
        throw new Error(`--${toKebabCase(field.replace('Json', ''))} is required for the ${options.lane} lane`);
      }
    }
  }

  const needsArticle = options.lane === 'article-claim' || options.lane === 'all';
  if (needsArticle) {
    for (const field of ['resultsReportJson', 'reviewedExplanationsJson']) {
      if (!options[field]) {
        throw new Error(`--${toKebabCase(field.replace('Json', ''))} is required for the ${options.lane} lane`);
      }
    }
  }
};

export const writeGuardrailEvaluation = (options) => {
  const report = buildGuardrailEvaluationReport({
    lane: options.lane,
    repoRoot: options.repoRoot,
    sources: {
      advisoryArtifact: options.advisoryJson ? readJson(options.advisoryJson) : undefined,
      advisoryPath: options.advisoryJson,
      checklistArtifact: options.checklistJson ? readJson(options.checklistJson) : undefined,
      checklistPath: options.checklistJson,
      promotedArtifact: options.promotedJson ? readJson(options.promotedJson) : undefined,
      promotedPath: options.promotedJson,
      resultsReport: options.resultsReportJson ? readJson(options.resultsReportJson) : undefined,
      resultsReportPath: options.resultsReportJson,
      reviewedArtifact: options.reviewedJson ? readJson(options.reviewedJson) : undefined,
      reviewedExplanationsArtifact: options.reviewedExplanationsJson
        ? readJson(options.reviewedExplanationsJson)
        : undefined,
      reviewedExplanationsPath: options.reviewedExplanationsJson,
      reviewedPath: options.reviewedJson,
    },
  });

  fs.mkdirSync(options.outputDir, { recursive: true });
  const outputPath = path.join(options.outputDir, OUTPUT_FILE);
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n', 'utf-8');

  return {
    laneStatus: report.summary.requested_lane_status,
    outputPath,
    report,
  };
};

export const buildGuardrailEvaluationReport = ({ lane, repoRoot, sources }) => {
  const requestedLanes = lane === 'all' ? ['promotion', 'article-claim'] : [lane];
  const lanes = {};
  if (requestedLanes.includes('promotion')) {
    lanes.promotion = evaluatePromotionLane({
      advisoryArtifact: sources.advisoryArtifact,
      advisoryPath: sources.advisoryPath,
      checklistArtifact: sources.checklistArtifact,
      promotedArtifact: sources.promotedArtifact,
      repoRoot,
      reviewedArtifact: sources.reviewedArtifact,
      reviewedPath: sources.reviewedPath,
    });
  }
  if (requestedLanes.includes('article-claim')) {
    lanes['article-claim'] = evaluateArticleClaimLane({
      resultsReport: sources.resultsReport,
      resultsReportPath: sources.resultsReportPath,
      reviewedExplanationsArtifact: sources.reviewedExplanationsArtifact,
    });
  }

  const requestedStatuses = requestedLanes.map((requestedLane) => lanes[requestedLane].status);
  return {
    schema_version: GUARDRAIL_SCHEMA_VERSION,
    workflow_version: GUARDRAIL_WORKFLOW_VERSION,
    generated_at: new Date().toISOString(),
    requested_lane: lane,
    source_artifacts: buildSourceArtifacts(sources),
    lanes,
    summary: {
      blocked_lanes: requestedLanes.filter((requestedLane) => lanes[requestedLane].status === 'fail'),
      requested_lane_status: requestedStatuses.every((status) => status === 'pass') ? 'pass' : 'fail',
      requested_lanes: requestedLanes,
    },
  };
};

const evaluatePromotionLane = ({
  advisoryArtifact,
  advisoryPath,
  checklistArtifact,
  promotedArtifact,
  repoRoot,
  reviewedArtifact,
  reviewedPath,
}) => {
  validatePromotionArtifacts({
    advisoryArtifact,
    checklistArtifact,
    promotedArtifact,
    reviewedArtifact,
  });

  const findings = [];
  const advisoryCandidates = new Map(
    (advisoryArtifact.candidate_rules ?? []).map((rule) => {
      const normalized = normalizeCandidateRule(rule);
      return [String(normalized.candidate_id), normalized];
    })
  );
  const reviewedRules = reviewedArtifact.reviewed_rules;
  const reviewedRuleMap = new Map(reviewedRules.map((rule) => [String(rule.candidate_id), rule]));
  const eligibleReviewedIds = setOf(
    reviewedRules
      .filter((rule) => rule.review?.promotion_eligible === true)
      .map((rule) => String(rule.candidate_id))
  );
  const promotedRules = promotedArtifact.promoted_rules ?? [];
  const promotedIds = setOf(promotedRules.map((rule) => String(rule.candidate_id)));
  const promotionCandidateIds = setOf(
    (checklistArtifact.promotion_candidates ?? []).map((candidate) => String(candidate.candidate_id))
  );
  const checklistResults = new Map(
    (checklistArtifact.checklist_results ?? []).map((result) => [String(result.candidate_id), result])
  );
  const checklistPromotionCandidates = new Map(
    (checklistArtifact.promotion_candidates ?? []).map((candidate) => [String(candidate.candidate_id), candidate])
  );

  compareAdvisoryRunMetadata({
    actualMetadata: reviewedArtifact.advisory_run,
    advisoryArtifact,
    advisoryPath,
    findings,
    findingId: 'reviewed-advisory-run',
    label: 'Reviewed artifact',
  });
  compareReviewedArtifactPath({
    checklistArtifact,
    findings,
    label: 'Checklist artifact',
    reviewedPath,
  });
  compareWorkflowVersion({
    checklistArtifact,
    findings,
    reviewedArtifact,
  });
  compareAdvisoryRunMetadata({
    actualMetadata: checklistArtifact.advisory_run,
    advisoryArtifact,
    advisoryPath,
    findings,
    findingId: 'checklist-advisory-run',
    label: 'Checklist artifact',
  });
  compareAdvisoryRunMetadata({
    actualMetadata: promotedArtifact.advisory_run,
    advisoryArtifact,
    advisoryPath,
    findings,
    findingId: 'promoted-advisory-run',
    label: 'Promoted config',
  });
  comparePromotedWorkflowVersion({
    findings,
    promotedArtifact,
    reviewedArtifact,
  });

  if (!containsAdvisoryOnlyGuardrail(advisoryArtifact.review_notes ?? [])) {
    findings.push(failFinding(
      'advisory-boundary',
      'Advisory artifact review_notes must state advisory-only scope and human approval.'
    ));
  } else {
    findings.push(passFinding(
      'advisory-boundary',
      'Advisory artifact keeps the advisory-only and human-approval boundary explicit.'
    ));
  }

  const policyText = String(promotedArtifact.promotion_policy?.description ?? '').toLowerCase();
  if (!policyText.includes('do not read') && !policyText.includes('not read this artifact automatically')) {
    findings.push(failFinding(
      'promotion-policy',
      'Promoted config must preserve a non-auto-consumption policy description.'
    ));
  } else {
    findings.push(passFinding(
      'promotion-policy',
      'Promoted config preserves the emitted-only, non-auto-consumption policy text.'
    ));
  }

  compareCandidateIdSets('promoted-reviewed', promotedIds, eligibleReviewedIds, findings);
  compareCandidateIdSets('promoted-checklist', promotedIds, promotionCandidateIds, findings);

  const ruleSummaries = promotedRules.map((rule) => {
    const candidateId = String(rule.candidate_id);
    const advisoryRule = advisoryCandidates.get(candidateId);
    const reviewedRule = reviewedRuleMap.get(candidateId);
    const checklistResult = checklistResults.get(candidateId);
    const checklistPromotionCandidate = checklistPromotionCandidates.get(candidateId);
    const reviewedClassification = String(reviewedRule?.review?.validated_classification ?? '');
    const promotedClassification = String(rule.classification ?? '');
    const checklistClassification = String(checklistPromotionCandidate?.validated_classification ?? '');
    const reviewedLane = classificationLane(reviewedClassification);
    const promotedLane = classificationLane(promotedClassification);
    const checklistLane = classificationLane(checklistClassification);

    if (!advisoryRule) {
      findings.push(failFinding(
        `advisory-rule:${candidateId}`,
        `Promoted rule ${candidateId} cannot be joined back to an advisory candidate.`
      ));
    }
    if (advisoryRule?.requires_human_approval !== true) {
      findings.push(failFinding(
        `human-approval:${candidateId}`,
        `Promoted rule ${candidateId} did not keep requires_human_approval=true in the advisory artifact.`
      ));
    }
    if (!reviewedRule) {
      findings.push(failFinding(
        `promoted-rule:${candidateId}`,
        `Promoted rule ${candidateId} is missing from reviewed rules.`
      ));
    }
    if (!checklistResult) {
      findings.push(failFinding(
        `checklist-rule:${candidateId}`,
        `Promoted rule ${candidateId} is missing from the checklist report.`
      ));
    }
    if (!checklistPromotionCandidate) {
      findings.push(failFinding(
        `promotion-candidate:${candidateId}`,
        `Promoted rule ${candidateId} is missing from checklist promotion_candidates.`
      ));
    }
    if (reviewedRule?.review?.promotion_eligible !== true) {
      findings.push(failFinding(
        `promotion-eligible:${candidateId}`,
        `Promoted rule ${candidateId} is not marked promotion_eligible in reviewed rules.`
      ));
    }
    if (checklistResult?.overallStatus !== 'pass') {
      findings.push(failFinding(
        `checklist-pass:${candidateId}`,
        `Promoted rule ${candidateId} does not have checklist overallStatus=pass.`
      ));
    }
    if (reviewedLane !== promotedLane || reviewedLane !== checklistLane) {
      findings.push(failFinding(
        `classification-drift:${candidateId}`,
        `Promoted rule ${candidateId} has mismatched classification lanes across reviewed, promoted, and checklist artifacts.`,
        {
          checklist: checklistLane,
          promoted: promotedLane,
          reviewed: reviewedLane,
        }
      ));
    }
    if (!ALLOWED_PROMOTION_LANES.has(reviewedLane)) {
      findings.push(failFinding(
        `classification-lane:${candidateId}`,
        `Promoted rule ${candidateId} has unsupported promotion classification lane ${reviewedLane || '<empty>'}.`
      ));
    }
    if (!reviewedReviewerIsComplete(reviewedArtifact.reviewer)) {
      findings.push(failFinding(
        `reviewer-provenance:${candidateId}`,
        `Reviewed artifact reviewer metadata is incomplete for promoted rule ${candidateId}.`
      ));
    }
    comparePromotedRule({
      checklistPromotionCandidate,
      findings,
      promotedRule: rule,
      reviewedArtifact,
      reviewedRule,
    });

    return {
      candidate_id: candidateId,
      checklist_classification_lane: checklistLane,
      classification_lane: reviewedLane,
      checklist_status: checklistResult?.overallStatus ?? '',
      promoted_classification_lane: promotedLane,
      requires_human_approval: advisoryRule?.requires_human_approval === true,
      promotion_eligible: reviewedRule?.review?.promotion_eligible === true,
    };
  });

  const consumerInspection = inspectRepoConsumers({
    repoRoot,
    prohibitedPatterns: [
      'candidate-rule-suggestions.json',
      'reviewed-candidate-rules.json',
      'promoted-fitness-config-v1.json',
      'llm-rule-validation-report.json',
    ],
  });
  if (consumerInspection.matches.length > 0) {
    findings.push(failFinding(
      'repo-consumers',
      'Repo-local execution surfaces reference advisory artifacts as potential inputs.',
      consumerInspection.matches
    ));
  } else {
    findings.push(passFinding(
      'repo-consumers',
      'No repo-local consumer references were found outside the allowed LLM workflow surfaces.'
    ));
  }

  return {
    findings,
    repo_consumer_inspection: consumerInspection,
    rule_summaries: ruleSummaries,
    status: findings.every((finding) => finding.status === 'pass') ? 'pass' : 'fail',
  };
};

const evaluateArticleClaimLane = ({
  resultsReport,
  resultsReportPath,
  reviewedExplanationsArtifact,
}) => {
  validateArticleArtifacts({ resultsReport, reviewedExplanationsArtifact });
  const findings = [];
  const explanations = reviewedExplanationsArtifact.reviewed_explanations ?? [];
  const readiness = assessArticleReadiness(resultsReport);
  const sharedLimitations = buildArticleLimitations(readiness);
  const articleTargets = buildArticleTargets(resultsReport);
  const paretoByCandidate = new Map(
    resultsReport.tables.paretoCandidates
      .filter((row) => typeof row.candidateId === 'string' && row.candidateId !== '')
      .map((row) => [String(row.candidateId), row])
  );
  const allowedEvidenceRefs = buildArticleEvidenceRefs({
    paretoByCandidate,
    readiness,
    resultsReport,
    resultsReportPath,
  });

  if (explanations.length === 0) {
    findings.push(failFinding(
      'reviewed-explanations',
      'Reviewed explanation artifact must contain at least one reviewed explanation.'
    ));
  }

  const sourcePaths = new Set(
    (reviewedExplanationsArtifact.source_artifacts ?? []).map((artifact) => String(artifact.path ?? ''))
  );
  if (!sourcePaths.has(resultsReportPath)) {
    findings.push(failFinding(
      'results-boundary',
      'Reviewed explanation artifact is not rooted in the supplied results-report path.'
    ));
  } else {
    findings.push(passFinding(
      'results-boundary',
      'Reviewed explanation artifact remains rooted in the supplied results-report boundary.'
    ));
  }

  const explanationSummaries = explanations.map((explanation) => {
    const explanationId = String(explanation.explanation_id);
    const review = explanation.review ?? {};
    const draftEvidenceRefs = normalizeStringList(explanation.evidence_refs);
    const target = findArticleTarget(articleTargets, explanation);
    const candidateId = target?.candidateId ?? String(explanation.candidate_id ?? '');
    const expectedEvidenceRefs = buildExpectedExplanationRefs({
      candidateId,
      limitations: sharedLimitations,
      paretoByCandidate,
      resultsReportPath,
      scalarTopCandidateId: String(target?.fixedScalarTopCandidateId ?? ''),
    });
    const allowedArtifacts = new Set([resultsReportPath, ...expectedEvidenceRefs]);

    validateReviewedExplanationShape({
      explanation,
      explanationId,
      findings,
      sharedLimitations,
      target,
    });

    if (review.status !== 'accepted') {
      findings.push(failFinding(
        `review-status:${explanationId}`,
        `Explanation ${explanationId} is not accepted for article-facing use.`
      ));
    }
    if (!ARTICLE_READY_STATES.has(String(review.article_readiness ?? ''))) {
      findings.push(failFinding(
        `article-readiness:${explanationId}`,
        `Explanation ${explanationId} is not article-ready under the allowed guardrail states.`
      ));
    }
    if (explanation.requires_human_review !== true) {
      findings.push(failFinding(
        `human-review:${explanationId}`,
        `Explanation ${explanationId} does not preserve requires_human_review=true.`
      ));
    }
    if (!draftEvidenceRefs.every((artifact) => allowedEvidenceRefs.has(artifact))) {
      findings.push(failFinding(
        `evidence-refs:${explanationId}`,
        `Explanation ${explanationId} includes evidence_refs outside the canonical results-report boundary.`
      ));
    }
    compareStringSets(
      `evidence-target:${explanationId}`,
      setOf(draftEvidenceRefs),
      setOf(expectedEvidenceRefs),
      findings,
      'Explanation evidence_refs do not match the exact per-explanation target contract.'
    );

    const referencedArtifacts = normalizeStringList(review.referenced_source_artifacts);
    if (!referencedArtifacts.every((artifact) => allowedArtifacts.has(artifact))) {
      findings.push(failFinding(
        `source-boundary:${explanationId}`,
        `Explanation ${explanationId} cites artifacts outside the results-report boundary.`
      ));
    }

    return {
      article_readiness: String(review.article_readiness ?? ''),
      explanation_id: explanationId,
      requires_human_review: explanation.requires_human_review === true,
      review_status: String(review.status ?? ''),
    };
  });

  if (readiness.status === 'insufficient-evidence') {
    findings.push(failFinding(
      'results-readiness',
      `results-report.json is not safe for article claims: ${readiness.reasons.join(', ')}.`
    ));
  } else {
    findings.push(passFinding(
      'results-readiness',
      'results-report.json satisfies the explanation workflow readiness contract for article claims.'
    ));
  }

  return {
    explanation_summaries: explanationSummaries,
    findings,
    status: findings.every((finding) => finding.status === 'pass') ? 'pass' : 'fail',
  };
};

const compareCandidateIdSets = (findingId, actual, expected, findings) => {
  const extra = difference(actual, expected);
  const missing = difference(expected, actual);
  if (extra.length > 0 || missing.length > 0) {
    findings.push(failFinding(
      findingId,
      'Candidate IDs do not match across the required artifacts.',
      { extra, missing }
    ));
    return;
  }
  findings.push(passFinding(
    findingId,
    'Candidate IDs match exactly across the required artifacts.'
  ));
};

const compareStringSets = (findingId, actual, expected, findings, detail) => {
  const extra = difference(actual, expected);
  const missing = difference(expected, actual);
  if (extra.length > 0 || missing.length > 0) {
    findings.push(failFinding(
      findingId,
      detail,
      { extra, missing }
    ));
    return;
  }
  findings.push(passFinding(
    findingId,
    'Values match the expected set exactly.'
  ));
};

const inspectRepoConsumers = ({ repoRoot, prohibitedPatterns }) => {
  const matches = [];
  const scanRoots = resolveConsumerScanRoots(repoRoot);
  for (const scanRoot of scanRoots) {
    for (const filePath of walkRepoFiles(scanRoot)) {
      const relativePath = path.relative(scanRoot, filePath);
      if (isAllowedRepoReference(relativePath)) {
        continue;
      }
      if (prohibitedPatterns.includes(path.basename(relativePath)) || path.basename(relativePath) === OUTPUT_FILE) {
        continue;
      }
      const fileText = fs.readFileSync(filePath, 'utf-8');
      const matchedPatterns = prohibitedPatterns.filter((pattern) => fileText.includes(pattern));
      if (matchedPatterns.length > 0) {
        matches.push({
          matched_patterns: matchedPatterns,
          path: path.relative(repoRoot, filePath),
        });
      }
    }
  }
  return {
    matches,
    repo_root: repoRoot,
    scan_roots: scanRoots,
  };
};

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const resolveConsumerScanRoots = (repoRoot) => {
  const roots = [repoRoot];
  const monorepoRoot = path.resolve(repoRoot, '..', '..');
  for (const directory of MONOREPO_SCAN_DIRS) {
    const candidate = path.join(monorepoRoot, directory);
    if (fs.existsSync(candidate)) {
      roots.push(candidate);
    }
  }
  return roots;
};

const compareAdvisoryRunMetadata = ({
  actualMetadata,
  advisoryArtifact,
  advisoryPath,
  findings,
  findingId,
  label,
}) => {
  const mismatches = [];
  if (String(actualMetadata?.advisory_path ?? '') !== advisoryPath) {
    mismatches.push('advisory_path');
  }
  for (const field of ['generated_at', 'provider', 'model', 'prototype_version']) {
    if (String(actualMetadata?.[field] ?? '') !== String(advisoryArtifact?.[field] ?? '')) {
      mismatches.push(field);
    }
  }
  if (JSON.stringify(actualMetadata?.source_artifacts ?? []) !== JSON.stringify(advisoryArtifact?.source_artifacts ?? [])) {
    mismatches.push('source_artifacts');
  }
  if (mismatches.length > 0) {
    findings.push(failFinding(
      findingId,
      `${label} advisory_run metadata does not match the supplied advisory artifact.`,
      { mismatches }
    ));
    return;
  }
  findings.push(passFinding(
    findingId,
    `${label} advisory_run metadata matches the supplied advisory artifact.`
  ));
};

const compareReviewedArtifactPath = ({
  checklistArtifact,
  findings,
  label,
  reviewedPath,
}) => {
  if (String(checklistArtifact?.reviewed_artifact_path ?? '') !== reviewedPath) {
    findings.push(failFinding(
      'reviewed-artifact-path',
      `${label} reviewed_artifact_path does not match the supplied reviewed artifact path.`
    ));
    return;
  }
  findings.push(passFinding(
    'reviewed-artifact-path',
    `${label} remains traceable to the supplied reviewed artifact path.`
  ));
};

const compareWorkflowVersion = ({
  checklistArtifact,
  findings,
  reviewedArtifact,
}) => {
  if (String(checklistArtifact?.workflow_version ?? '') !== String(reviewedArtifact?.workflow_version ?? '')) {
    findings.push(failFinding(
      'workflow-version',
      'Checklist artifact workflow_version does not match the reviewed artifact workflow version.'
    ));
    return;
  }
  findings.push(passFinding(
    'workflow-version',
    'Checklist artifact keeps the reviewed artifact workflow version aligned.'
  ));
};

const comparePromotedWorkflowVersion = ({
  findings,
  promotedArtifact,
  reviewedArtifact,
}) => {
  if (String(promotedArtifact?.workflow_version ?? '') !== String(reviewedArtifact?.workflow_version ?? '')) {
    findings.push(failFinding(
      'promoted-workflow-version',
      'Promoted artifact workflow_version does not match the reviewed artifact workflow version.'
    ));
    return;
  }
  findings.push(passFinding(
    'promoted-workflow-version',
    'Promoted artifact keeps the reviewed artifact workflow version aligned.'
  ));
};

const comparePromotedRule = ({
  checklistPromotionCandidate,
  findings,
  promotedRule,
  reviewedArtifact,
  reviewedRule,
}) => {
  if (!reviewedRule) {
    return;
  }
  const reviewer = reviewedArtifact.reviewer ?? {};
  const mismatches = [];
  const fieldPairs = [
    ['name', reviewedRule.name],
    ['classification', reviewedRule.review?.validated_classification],
    ['metric', reviewedRule.metric],
    ['direction', reviewedRule.direction],
    ['constraint', reviewedRule.constraint ?? ''],
    ['rationale', reviewedRule.rationale],
    ['evidence', reviewedRule.evidence],
    ['threshold_basis', reviewedRule.review?.validation?.threshold_basis],
    ['approved_by', reviewer.name],
    ['approved_at', reviewer.reviewed_at],
  ];
  for (const [field, expected] of fieldPairs) {
    if (String(promotedRule?.[field] ?? '') !== String(expected ?? '')) {
      mismatches.push(field);
    }
  }
  if (JSON.stringify(promotedRule?.scenarioScope ?? []) !== JSON.stringify(reviewedRule.scenarioScope ?? [])) {
    mismatches.push('scenarioScope');
  }
  if (JSON.stringify(promotedRule?.source_artifacts ?? []) !== JSON.stringify(reviewedRule.review?.referenced_source_artifacts ?? [])) {
    mismatches.push('source_artifacts');
  }
  if (JSON.stringify(promotedRule?.review_reason_codes ?? []) !== JSON.stringify(reviewedRule.review?.reason_codes ?? [])) {
    mismatches.push('review_reason_codes');
  }
  if (String(checklistPromotionCandidate?.validated_classification ?? '') !== String(reviewedRule.review?.validated_classification ?? '')) {
    mismatches.push('validated_classification');
  }
  if (mismatches.length > 0) {
    findings.push(failFinding(
      `promoted-shape:${promotedRule.candidate_id}`,
      `Promoted rule ${promotedRule.candidate_id} diverges from the reviewed/checklist artifact chain.`,
      { mismatches }
    ));
    return;
  }
  findings.push(passFinding(
    `promoted-shape:${promotedRule.candidate_id}`,
    `Promoted rule ${promotedRule.candidate_id} matches the reviewed/checklist artifact chain.`
  ));
};

const reviewedReviewerIsComplete = (reviewer) => {
  return String(reviewer?.name ?? '') !== ''
    && String(reviewer?.role ?? '') !== ''
    && String(reviewer?.reviewed_at ?? '') !== '';
};

const validatePromotionArtifacts = ({
  advisoryArtifact,
  checklistArtifact,
  promotedArtifact,
  reviewedArtifact,
}) => {
  if (!Array.isArray(advisoryArtifact?.review_notes)) {
    throw new Error('Advisory artifact must include review_notes');
  }
  if (!Array.isArray(advisoryArtifact?.candidate_rules)) {
    throw new Error('Advisory artifact must include candidate_rules');
  }
  if (!reviewedArtifact?.advisory_run) {
    throw new Error('Reviewed artifact must include advisory_run');
  }
  if (typeof reviewedArtifact?.workflow_version !== 'string') {
    throw new Error('Reviewed artifact must include workflow_version');
  }
  if (!Array.isArray(reviewedArtifact?.reviewed_rules)) {
    throw new Error('Reviewed artifact must include reviewed_rules');
  }
  if (!promotedArtifact?.advisory_run) {
    throw new Error('Promoted artifact must include advisory_run');
  }
  if (!Array.isArray(promotedArtifact?.promoted_rules)) {
    throw new Error('Promoted artifact must include promoted_rules');
  }
  if (!checklistArtifact?.advisory_run) {
    throw new Error('Checklist artifact must include advisory_run');
  }
  if (typeof checklistArtifact?.reviewed_artifact_path !== 'string') {
    throw new Error('Checklist artifact must include reviewed_artifact_path');
  }
  if (typeof checklistArtifact?.workflow_version !== 'string') {
    throw new Error('Checklist artifact must include workflow_version');
  }
  if (!Array.isArray(checklistArtifact?.promotion_candidates)) {
    throw new Error('Checklist artifact must include promotion_candidates');
  }
  if (!Array.isArray(checklistArtifact?.checklist_results)) {
    throw new Error('Checklist artifact must include checklist_results');
  }
};

const validateArticleArtifacts = ({ resultsReport, reviewedExplanationsArtifact }) => {
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
  if (!Array.isArray(resultsReport.tables.paretoCandidates)) {
    throw new Error('results-report.json must include tables.paretoCandidates');
  }
  if (!isRecord(resultsReport.limitations)) {
    throw new Error('results-report.json must include limitations');
  }
  if (String(reviewedExplanationsArtifact?.workflow_version ?? '') !== 'llm-tradeoff-explanations-v1') {
    throw new Error('Reviewed explanations artifact must include workflow_version=llm-tradeoff-explanations-v1');
  }
  if (!reviewedReviewerIsComplete(reviewedExplanationsArtifact?.reviewer)) {
    throw new Error('Reviewed explanations artifact must include complete reviewer metadata');
  }
  if (!Array.isArray(reviewedExplanationsArtifact?.reviewed_explanations)) {
    throw new Error('Reviewed explanations artifact must include reviewed_explanations');
  }
};

const assessArticleReadiness = (resultsReport) => {
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

  const status = resultsReport.canonicalComparison?.status !== 'available'
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
    excludedEvidenceReasons: limitations.excludedEvidenceReasons ?? [],
    missingRuntimeMetrics: limitations.missingRuntimeMetrics ?? [],
    omittedObjectives: limitations.omittedObjectives ?? [],
    reasons,
    status,
  };
};

const buildArticleEvidenceRefs = ({
  paretoByCandidate,
  readiness,
  resultsReport,
  resultsReportPath,
}) => {
  const refs = new Set([`results-report:${resultsReportPath}`]);
  const decisionRows = Array.isArray(resultsReport.tables?.decisionUsefulness)
    ? resultsReport.tables.decisionUsefulness
    : [];

  decisionRows.forEach((row) => {
    const candidateId = String(row.candidateId ?? '');
    const scalarTop = String(row.fixedScalarTopCandidateId ?? '');
    if (candidateId !== '') {
      refs.add(`decision-candidate:${candidateId}`);
    }
    if (scalarTop !== '') {
      refs.add(`scalar-top:${scalarTop}`);
    }
    const pareto = paretoByCandidate.get(candidateId);
    if (pareto && String(pareto.rank ?? '') !== '') {
      refs.add(`pareto-rank:${candidateId}:${String(pareto.rank)}`);
    }
  });

  buildArticleLimitations(readiness).forEach((limitation) => refs.add(`limitation:${limitation}`));
  return refs;
};

const buildExpectedExplanationRefs = ({
  candidateId,
  limitations,
  paretoByCandidate,
  resultsReportPath,
  scalarTopCandidateId,
}) => {
  const refs = [`results-report:${resultsReportPath}`];
  if (candidateId !== '') {
    refs.push(`decision-candidate:${candidateId}`);
  }
  if (scalarTopCandidateId !== '') {
    refs.push(`scalar-top:${scalarTopCandidateId}`);
  }
  const pareto = paretoByCandidate.get(candidateId);
  if (pareto && String(pareto.rank ?? '') !== '') {
    refs.push(`pareto-rank:${candidateId}:${String(pareto.rank)}`);
  }
  normalizeStringList(limitations).forEach((limitation) => refs.push(`limitation:${limitation}`));
  return refs;
};

const buildArticleLimitations = (readiness) => {
  const messages = [];
  if (readiness.status === 'limitations-required') {
    if (readiness.missingRuntimeMetrics.length > 0) {
      messages.push(`Missing runtime metrics: ${readiness.missingRuntimeMetrics.join(', ')}`);
    }
    if (readiness.omittedObjectives.length > 0) {
      messages.push(`Omitted objectives: ${readiness.omittedObjectives.join(', ')}`);
    }
    if (readiness.excludedEvidenceReasons.length > 0) {
      messages.push(`Excluded evidence reasons: ${readiness.excludedEvidenceReasons.join(', ')}`);
    }
  }
  if (readiness.status === 'insufficient-evidence') {
    messages.push(`Drafting refused because: ${readiness.reasons.join(', ')}`);
  }
  return messages;
};

const buildArticleTargets = (resultsReport) => {
  const targets = new Map();
  const decisionRows = Array.isArray(resultsReport.tables?.decisionUsefulness)
    ? resultsReport.tables.decisionUsefulness
    : [];

  decisionRows.forEach((row) => {
    const candidateId = String(row.candidateId ?? '');
    const fixedScalarTopCandidateId = String(row.fixedScalarTopCandidateId ?? '');
    if (candidateId !== '') {
      targets.set(articleTargetKey('candidate-tradeoff', candidateId, fixedScalarTopCandidateId), {
        candidateId,
        decisionRow: row,
        explanationType: 'candidate-tradeoff',
        fixedScalarTopCandidateId,
      });
      return;
    }
    if (String(row.usefulnessClassification ?? '') !== '' || fixedScalarTopCandidateId !== '') {
      targets.set(articleTargetKey('comparison-summary', candidateId, fixedScalarTopCandidateId), {
        candidateId,
        decisionRow: row,
        explanationType: 'comparison-summary',
        fixedScalarTopCandidateId,
      });
    }
  });
  return targets;
};

const articleTargetKey = (explanationType, candidateId, fixedScalarTopCandidateId) => (
  explanationType === 'comparison-summary'
    ? `comparison-summary:${fixedScalarTopCandidateId}`
    : `candidate-tradeoff:${candidateId}`
);

const findArticleTarget = (articleTargets, explanation) => articleTargets.get(articleTargetKey(
  String(explanation?.explanation_type ?? ''),
  String(explanation?.candidate_id ?? ''),
  String(explanation?.fixed_scalar_top_candidate_id ?? '')
));

const validateReviewedExplanationShape = ({
  explanation,
  explanationId,
  findings,
  sharedLimitations,
  target,
}) => {
  const explanationType = String(explanation?.explanation_type ?? '');
  const candidateId = String(explanation?.candidate_id ?? '');
  const isComparisonSummary = explanationType === 'comparison-summary';
  const requiredStringFields = [
    'explanation_id',
    'explanation_type',
    'title',
    'summary',
  ];
  requiredStringFields.forEach((field) => {
    if (String(explanation?.[field] ?? '').trim() === '') {
      findings.push(failFinding(
        `shape:${explanationId}:${field}`,
        `Explanation ${explanationId} is missing required field ${field}.`
      ));
    }
  });
  if (!['candidate-tradeoff', 'comparison-summary'].includes(String(explanation?.explanation_type ?? ''))) {
    findings.push(failFinding(
      `shape:${explanationId}:explanation_type`,
      `Explanation ${explanationId} has unsupported explanation_type ${String(explanation?.explanation_type ?? '') || '<empty>'}.`
    ));
  }
  if (!Array.isArray(explanation?.limitations)) {
    findings.push(failFinding(
      `shape:${explanationId}:limitations`,
      `Explanation ${explanationId} must include a limitations array.`
    ));
  }
  if (!Array.isArray(explanation?.evidence_refs) || explanation.evidence_refs.length === 0) {
    findings.push(failFinding(
      `shape:${explanationId}:evidence_refs`,
      `Explanation ${explanationId} must include a non-empty evidence_refs array.`
    ));
  }
  if (!Array.isArray(explanation?.review?.reason_codes) || explanation.review.reason_codes.length === 0) {
    findings.push(failFinding(
      `shape:${explanationId}:reason_codes`,
      `Explanation ${explanationId} must include non-empty review.reason_codes.`
    ));
  }
  if (
    !Array.isArray(explanation?.review?.referenced_source_artifacts)
    || explanation.review.referenced_source_artifacts.length === 0
  ) {
    findings.push(failFinding(
      `shape:${explanationId}:referenced_source_artifacts`,
      `Explanation ${explanationId} must include non-empty review.referenced_source_artifacts.`
    ));
  }
  if (String(explanation?.review?.rationale ?? '').trim() === '') {
    findings.push(failFinding(
      `shape:${explanationId}:review_rationale`,
      `Explanation ${explanationId} must include non-empty review.rationale.`
    ));
  }
  if (!isComparisonSummary && candidateId === '') {
    findings.push(failFinding(
      `shape:${explanationId}:candidate_id`,
      `Explanation ${explanationId} must include candidate_id for candidate-tradeoff explanations.`
    ));
  }
  if (isComparisonSummary && candidateId !== '') {
    findings.push(failFinding(
      `shape:${explanationId}:candidate_id-summary`,
      `Explanation ${explanationId} must keep candidate_id empty for comparison-summary explanations.`
    ));
  }
  if (!target) {
    findings.push(failFinding(
      `target-row:${explanationId}`,
      `Explanation ${explanationId} does not map to a canonical target row in results-report.json.`
    ));
  }
  if (String(explanation?.fixed_scalar_top_candidate_id ?? '') !== String(target?.fixedScalarTopCandidateId ?? '')) {
    findings.push(failFinding(
      `shape:${explanationId}:fixed_scalar_top_candidate_id`,
      `Explanation ${explanationId} does not keep the canonical fixed_scalar_top_candidate_id from results-report.json.`
    ));
  }
  if (JSON.stringify(normalizeStringList(explanation?.limitations)) !== JSON.stringify(normalizeStringList(sharedLimitations))) {
    findings.push(failFinding(
      `shape:${explanationId}:limitations-content`,
      `Explanation ${explanationId} does not keep the canonical shared limitations from results-report.json.`
    ));
  }
};
function* walkRepoFiles(rootDir) {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    if (REPO_SCAN_EXCLUDED_DIRS.has(entry.name)) {
      continue;
    }
    const resolvedPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      yield* walkRepoFiles(resolvedPath);
      continue;
    }
    if (!REPO_SCAN_EXTENSIONS.has(path.extname(entry.name)) && entry.name !== 'Makefile') {
      continue;
    }
    yield resolvedPath;
  }
}

const isAllowedRepoReference = (relativePath) => {
  const normalized = `${path.sep}${relativePath}`;
  return REPO_SCAN_ALLOWED_SEGMENTS.some((segment) => normalized.includes(segment));
};


const buildSourceArtifacts = (sources) => {
  const values = [
    ['advisory-json', sources.advisoryPath],
    ['reviewed-json', sources.reviewedPath],
    ['promoted-json', sources.promotedPath],
    ['checklist-json', sources.checklistPath],
    ['results-report-json', sources.resultsReportPath],
    ['reviewed-explanations-json', sources.reviewedExplanationsPath],
  ];
  return values
    .filter(([, sourcePath]) => sourcePath)
    .map(([artifactType, sourcePath]) => ({
      artifactType,
      path: sourcePath,
    }));
};

const containsAdvisoryOnlyGuardrail = (reviewNotes) => {
  const text = reviewNotes.map((note) => String(note).toLowerCase()).join(' ');
  return text.includes('advisory only') && text.includes('human approval');
};

const classificationLane = (classification) => {
  if (classification === 'objective' || classification === 'objective-with-constraint') {
    return 'objective';
  }
  if (classification === 'hard-constraint') {
    return 'constraint';
  }
  if (classification === 'context-signal') {
    return 'context';
  }
  return classification;
};

const difference = (left, right) => [...left].filter((item) => !right.has(item)).sort();

const failFinding = (id, detail, evidence = undefined) => ({
  detail,
  evidence,
  id,
  status: 'fail',
});

const normalizeStringList = (values) => Array.isArray(values)
  ? values.map((value) => String(value))
  : [];

const passFinding = (id, detail) => ({
  detail,
  id,
  status: 'pass',
});

const readJson = (sourcePath) => JSON.parse(fs.readFileSync(sourcePath, 'utf-8'));

const readOptionValue = (argv, index, option) => {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${option} requires a value`);
  }
  return value;
};

const setOf = (values) => new Set(values);

const toKebabCase = (value) => value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
