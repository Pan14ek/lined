import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const REVIEW_SCHEMA_VERSION = 1;
export const REVIEW_WORKFLOW_VERSION = 'llm-rule-review-workflow-v1';
export const PROMOTED_CONFIG_VERSION = 'llm-reviewed-rules-v1';

const REVIEW_OUTPUT_FILE = 'reviewed-candidate-rules.json';
const PROMOTED_OUTPUT_FILE = 'promoted-fitness-config-v1.json';
const SUPPORTED_CLASSIFICATIONS = Object.freeze([
  'objective',
  'objective-with-constraint',
  'hard-constraint',
  'warning',
  'context-signal',
  'validation-evidence',
  'exploratory',
]);

export const parseReviewWorkflowArgs = (argv) => {
  const options = {
    advisoryJson: undefined,
    outputDir: undefined,
    promotedVersion: PROMOTED_CONFIG_VERSION,
    reviewInputJson: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      return { ...options, help: true };
    }
    if (arg === '--advisory-json') {
      options.advisoryJson = readOptionValue(argv, index, arg);
      index += 1;
    } else if (arg === '--review-input-json') {
      options.reviewInputJson = readOptionValue(argv, index, arg);
      index += 1;
    } else if (arg === '--promoted-version') {
      options.promotedVersion = readOptionValue(argv, index, arg);
      index += 1;
    } else if (arg === '--output-dir') {
      options.outputDir = readOptionValue(argv, index, arg);
      index += 1;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  validateReviewWorkflowOptions(options);
  return options;
};

export const printReviewWorkflowHelp = () => `Usage:
  node load-tests/runtime-scenarios/llm-rule-review-workflow-cli.mjs [options]

Options:
  --advisory-json <path>       candidate-rule-suggestions.json input
  --review-input-json <path>   Reviewer decision input JSON
  --promoted-version <value>   Version label for promoted rules output
  --output-dir <dir>           Directory for review workflow outputs
`;

export const validateReviewWorkflowOptions = (options) => {
  if (!options.advisoryJson) {
    throw new Error('--advisory-json is required');
  }
  if (!options.reviewInputJson) {
    throw new Error('--review-input-json is required');
  }
  if (!options.outputDir) {
    throw new Error('--output-dir is required');
  }
};

export const writeRuleReviewWorkflow = (options) => {
  const advisory = readJson(options.advisoryJson);
  const reviewInput = readJson(options.reviewInputJson);
  const outputs = buildRuleReviewWorkflow({
    advisory,
    advisoryPath: options.advisoryJson,
    promotedVersion: options.promotedVersion,
    reviewInput,
    reviewInputPath: options.reviewInputJson,
  });

  fs.mkdirSync(options.outputDir, { recursive: true });
  const reviewPath = path.join(options.outputDir, REVIEW_OUTPUT_FILE);
  const promotedPath = path.join(options.outputDir, PROMOTED_OUTPUT_FILE);
  fs.writeFileSync(reviewPath, JSON.stringify(outputs.reviewArtifact, null, 2) + '\n', 'utf-8');
  fs.writeFileSync(promotedPath, JSON.stringify(outputs.promotedArtifact, null, 2) + '\n', 'utf-8');

  return {
    outputs: [reviewPath, promotedPath],
    promotedArtifact: outputs.promotedArtifact,
    reviewArtifact: outputs.reviewArtifact,
  };
};

export const buildRuleReviewWorkflow = ({
  advisory,
  advisoryPath,
  promotedVersion,
  reviewInput,
  reviewInputPath,
}) => {
  validateAdvisory(advisory);
  validateReviewInput(reviewInput);

  const normalizedRules = advisory.candidate_rules.map((rule) => normalizeCandidateRule(rule));
  const seenAdvisoryCandidateIds = new Set();
  for (const rule of normalizedRules) {
    if (seenAdvisoryCandidateIds.has(rule.candidate_id)) {
      throw new Error(`Duplicate advisory candidate ID: ${rule.candidate_id}`);
    }
    seenAdvisoryCandidateIds.add(rule.candidate_id);
  }
  const advisoryCandidateIds = new Set(normalizedRules.map((rule) => rule.candidate_id));
  const decisionMap = new Map();
  for (const decision of reviewInput.decisions ?? []) {
    const normalized = normalizeDecision(decision);
    if (decisionMap.has(normalized.candidate_id)) {
      throw new Error(`Duplicate review decision for candidate ID: ${normalized.candidate_id}`);
    }
    if (!advisoryCandidateIds.has(normalized.candidate_id)) {
      throw new Error(`Review decision references unknown candidate ID: ${normalized.candidate_id}`);
    }
    decisionMap.set(normalized.candidate_id, normalized);
  }

  const missingDecisions = normalizedRules
    .map((rule) => rule.candidate_id)
    .filter((candidateId) => !decisionMap.has(candidateId));
  if (missingDecisions.length > 0) {
    throw new Error(`Missing review decisions for candidate IDs: ${missingDecisions.join(', ')}`);
  }

  const reviewTimestamp = reviewInput.reviewed_at ?? advisory.generated_at ?? new Date().toISOString();
  const decisionSummary = {
    promote: 0,
    hold: 0,
    reject: 0,
    promotionEligible: 0,
  };
  const reviewedRules = normalizedRules.map((rule) => {
    const decision = decisionMap.get(rule.candidate_id);
    const validation = decision.validation;
    const promotionEligible = isPromotionEligible(decision);
    decisionSummary[decision.decision] += 1;
    if (promotionEligible) {
      decisionSummary.promotionEligible += 1;
    }
    return {
      ...rule,
      review: {
        decision: decision.decision,
        promotion_eligible: promotionEligible,
        rationale: decision.rationale,
        reason_codes: decision.reason_codes,
        referenced_source_artifacts: decision.referenced_source_artifacts,
        validated_classification: decision.validated_classification || rule.classification,
        validation: {
          duplicate_conflict_status: validation.duplicate_conflict_status,
          evidence_status: validation.evidence_status,
          measurable: validation.measurable,
          telemetry_linked: validation.telemetry_linked,
          threshold_basis: validation.threshold_basis,
        },
      },
    };
  });
  const reviewArtifact = {
    schema_version: REVIEW_SCHEMA_VERSION,
    workflow_version: REVIEW_WORKFLOW_VERSION,
    review_generated_at: new Date().toISOString(),
    advisory_run: buildAdvisoryRunMetadata(advisory, advisoryPath, reviewInput, reviewInputPath),
    reviewer: {
      name: reviewInput.reviewer?.name,
      role: reviewInput.reviewer?.role ?? '',
      reviewed_at: reviewTimestamp,
    },
    decision_summary: decisionSummary,
    reviewed_rules: reviewedRules,
  };

  const promotedArtifact = {
    schema_version: REVIEW_SCHEMA_VERSION,
    config_version: promotedVersion,
    generated_at: new Date().toISOString(),
    workflow_version: REVIEW_WORKFLOW_VERSION,
    advisory_run: {
      advisory_path: advisoryPath,
      generated_at: advisory.generated_at ?? '',
      model: advisory.model ?? '',
      output_type: 'candidate-rule-suggestions',
      prototype_version: advisory.prototype_version ?? '',
      provider: advisory.provider ?? '',
      source_artifacts: advisory.source_artifacts ?? [],
    },
    promotion_policy: {
      description: 'Manual review only. Collector and scoring paths do not read this artifact automatically in this task.',
      required_decision: 'promote',
      required_validation: {
        duplicate_conflict_status: 'unique',
        evidence_status: 'sufficient',
        measurable: true,
        telemetry_linked: true,
      },
    },
    promoted_rules: reviewArtifact.reviewed_rules
      .filter((rule) => rule.review.promotion_eligible)
      .map((rule) => ({
        candidate_id: rule.candidate_id,
        name: rule.name,
        classification: rule.review.validated_classification,
        metric: rule.metric,
        direction: rule.direction,
        constraint: rule.constraint,
        rationale: rule.rationale,
        evidence: rule.evidence,
        scenarioScope: rule.scenarioScope,
        source_artifacts: rule.review.referenced_source_artifacts,
        threshold_basis: rule.review.validation.threshold_basis,
        approved_by: reviewArtifact.reviewer.name,
        approved_at: reviewArtifact.reviewer.reviewed_at,
        review_reason_codes: rule.review.reason_codes,
      })),
  };

  return { promotedArtifact, reviewArtifact };
};

export const normalizeCandidateRule = (rule) => {
  const normalized = {
    name: String(rule.name),
    classification: String(rule.classification),
    metric: String(rule.metric),
    direction: String(rule.direction),
    constraint: String(rule.constraint ?? ''),
    rationale: String(rule.rationale),
    evidence: String(rule.evidence),
    scenarioScope: Array.isArray(rule.scenarioScope)
      ? rule.scenarioScope.map((item) => String(item))
      : [],
    requires_human_approval: rule.requires_human_approval !== false,
  };
  return {
    ...normalized,
    candidate_id: rule.candidate_id
      ? String(rule.candidate_id)
      : buildCandidateId(normalized),
  };
};

export const buildCandidateId = (rule) => {
  const payload = JSON.stringify({
    classification: rule.classification,
    constraint: rule.constraint,
    direction: rule.direction,
    evidence: rule.evidence,
    metric: rule.metric,
    name: rule.name,
    rationale: rule.rationale,
    scenarioScope: [...rule.scenarioScope].sort(),
  });
  const digest = crypto.createHash('sha256').update(payload).digest('hex').slice(0, 12);
  return `${slugify(rule.name)}-${digest}`;
};

const normalizeDecision = (decision) => {
  const validation = decision.validation ?? {};
  return {
    candidate_id: String(decision.candidate_id),
    decision: normalizeDecisionValue(decision.decision),
    rationale: String(decision.rationale ?? ''),
    reason_codes: Array.isArray(decision.reason_codes)
      ? decision.reason_codes.map((item) => String(item))
      : [],
    referenced_source_artifacts: Array.isArray(decision.referenced_source_artifacts)
      ? decision.referenced_source_artifacts.map((item) => String(item))
      : [],
    validated_classification: normalizeClassification(decision.validated_classification),
    validation: {
      duplicate_conflict_status: normalizeDuplicateStatus(validation.duplicate_conflict_status),
      evidence_status: normalizeEvidenceStatus(validation.evidence_status),
      measurable: validation.measurable === true,
      telemetry_linked: validation.telemetry_linked === true,
      threshold_basis: normalizeThresholdBasis(validation.threshold_basis),
    },
  };
};

const buildAdvisoryRunMetadata = (advisory, advisoryPath, reviewInput, reviewInputPath) => ({
  advisory_path: advisoryPath,
  advisory_review_input_path: reviewInputPath,
  generated_at: advisory.generated_at ?? '',
  model: advisory.model ?? '',
  output_type: 'candidate-rule-suggestions',
  prompt_version: reviewInput.advisory_metadata?.prompt_version ?? advisory.prototype_version ?? '',
  prototype_version: advisory.prototype_version ?? '',
  provider: advisory.provider ?? '',
  retrieved_sources: Array.isArray(reviewInput.advisory_metadata?.retrieved_sources)
    ? reviewInput.advisory_metadata.retrieved_sources.map((item) => String(item))
    : [],
  source_artifacts: advisory.source_artifacts ?? [],
  latency_ms: normalizeOptionalNumber(reviewInput.advisory_metadata?.latency_ms),
  cost_usd: normalizeOptionalNumber(reviewInput.advisory_metadata?.cost_usd),
  failure_mode: reviewInput.advisory_metadata?.failure_mode
    ? String(reviewInput.advisory_metadata.failure_mode)
    : '',
});

const validateAdvisory = (advisory) => {
  if (!Array.isArray(advisory?.candidate_rules) || advisory.candidate_rules.length === 0) {
    throw new Error('Advisory artifact must contain a non-empty candidate_rules array');
  }
};

const validateReviewInput = (reviewInput) => {
  if (!reviewInput?.reviewer?.name) {
    throw new Error('Review input must include reviewer.name');
  }
  if (!Array.isArray(reviewInput?.decisions) || reviewInput.decisions.length === 0) {
    throw new Error('Review input must contain a non-empty decisions array');
  }
};

const isPromotionEligible = (decision) => {
  return decision.decision === 'promote'
    && decision.validation.measurable
    && decision.validation.telemetry_linked
    && decision.validation.evidence_status === 'sufficient'
    && decision.validation.duplicate_conflict_status === 'unique'
    && decision.rationale.trim() !== ''
    && decision.reason_codes.length > 0
    && decision.referenced_source_artifacts.length > 0;
};

const normalizeDecisionValue = (value) => {
  const normalized = String(value);
  if (!['promote', 'hold', 'reject'].includes(normalized)) {
    throw new Error(`Unsupported review decision: ${value}`);
  }
  return normalized;
};

const normalizeClassification = (value) => {
  const normalized = String(value ?? '');
  if (!SUPPORTED_CLASSIFICATIONS.includes(normalized)) {
    throw new Error(`Unsupported validated classification: ${value}`);
  }
  return normalized;
};

const normalizeDuplicateStatus = (value) => {
  const normalized = String(value ?? '');
  if (!['unique', 'duplicates-existing-rule', 'duplicates-candidate', 'conflicts-existing-rule'].includes(normalized)) {
    throw new Error(`Unsupported duplicate/conflict status: ${value}`);
  }
  return normalized;
};

const normalizeEvidenceStatus = (value) => {
  const normalized = String(value ?? '');
  if (!['sufficient', 'partial', 'missing'].includes(normalized)) {
    throw new Error(`Unsupported evidence status: ${value}`);
  }
  return normalized;
};

const normalizeThresholdBasis = (value) => {
  const normalized = String(value ?? '');
  if (!['source-backed', 'empirical', 'initial-assumption', 'not-applicable'].includes(normalized)) {
    throw new Error(`Unsupported threshold basis: ${value}`);
  }
  return normalized;
};

const normalizeOptionalNumber = (value) => {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
};

const readJson = (sourcePath) => JSON.parse(fs.readFileSync(sourcePath, 'utf-8'));

const readOptionValue = (argv, index, option) => {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${option} requires a value`);
  }
  return value;
};

const slugify = (value) => value
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 48) || 'candidate-rule';
