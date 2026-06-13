import fs from 'node:fs';
import path from 'node:path';

export const CHECKLIST_SCHEMA_VERSION = 1;
export const CHECKLIST_VERSION = 'llm-rule-validation-checklist-v1';

const OUTPUT_FILE = 'llm-rule-validation-report.json';
const SUPPORTED_CLASSIFICATIONS = new Set([
  'objective',
  'objective-with-constraint',
  'hard-constraint',
  'warning',
  'context-signal',
  'validation-evidence',
  'exploratory',
]);

export const parseChecklistArgs = (argv) => {
  const options = {
    outputDir: undefined,
    reviewedJson: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      return { ...options, help: true };
    }
    if (arg === '--reviewed-json') {
      options.reviewedJson = readOptionValue(argv, index, arg);
      index += 1;
    } else if (arg === '--output-dir') {
      options.outputDir = readOptionValue(argv, index, arg);
      index += 1;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  validateChecklistOptions(options);
  return options;
};

export const printChecklistHelp = () => `Usage:
  node load-tests/runtime-scenarios/llm-rule-validation-checklist-cli.mjs [options]

Options:
  --reviewed-json <path>  reviewed-candidate-rules.json input
  --output-dir <dir>      Directory for checklist output
`;

export const validateChecklistOptions = (options) => {
  if (!options.reviewedJson) {
    throw new Error('--reviewed-json is required');
  }
  if (!options.outputDir) {
    throw new Error('--output-dir is required');
  }
};

export const writeRuleValidationChecklist = (options) => {
  const reviewedArtifact = readJson(options.reviewedJson);
  const report = buildRuleValidationChecklist({
    reviewedArtifact,
    reviewedArtifactPath: options.reviewedJson,
  });

  fs.mkdirSync(options.outputDir, { recursive: true });
  const outputPath = path.join(options.outputDir, OUTPUT_FILE);
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n', 'utf-8');

  return {
    outputPath,
    report,
  };
};

export const buildRuleValidationChecklist = ({
  reviewedArtifact,
  reviewedArtifactPath,
}) => {
  validateReviewedArtifact(reviewedArtifact);
  const reviewer = normalizeReviewer(reviewedArtifact.reviewer);
  const checklistResults = reviewedArtifact.reviewed_rules.map((rule) => checklistRule(rule, reviewer));
  const summary = buildSummary(checklistResults);

  return {
    schema_version: CHECKLIST_SCHEMA_VERSION,
    checklist_version: CHECKLIST_VERSION,
    generated_at: new Date().toISOString(),
    reviewed_artifact_path: reviewedArtifactPath,
    workflow_version: reviewedArtifact.workflow_version ?? '',
    advisory_run: reviewedArtifact.advisory_run ?? {},
    reviewer,
    summary,
    checklist_results: checklistResults,
    promotion_candidates: checklistResults
      .filter((result) => result.promotionEligible && result.overallStatus === 'pass')
      .map((result) => ({
        candidate_id: result.candidate_id,
        validated_classification: result.validatedClassification,
      })),
  };
};

const checklistRule = (rule, reviewer) => {
  const sourceEvidence = evaluateSourceEvidence(rule);
  const telemetryLinkage = evaluateTelemetryLinkage(rule);
  const classification = evaluateClassification(rule);
  const thresholdRationale = evaluateThresholdRationale(rule);
  const expertApproval = evaluateExpertApproval(rule, reviewer);
  const checks = {
    sourceEvidence,
    telemetryLinkage,
    classification,
    thresholdRationale,
    expertApproval,
  };

  return {
    candidate_id: String(rule.candidate_id),
    name: String(rule.name),
    reviewDecision: String(rule.review?.decision ?? ''),
    validatedClassification: String(rule.review?.validated_classification ?? ''),
    classificationLane: classification.classification_lane,
    promotionEligible: rule.review?.promotion_eligible === true,
    overallStatus: aggregateStatus(checks),
    checks,
  };
};

const evaluateSourceEvidence = (rule) => {
  const artifacts = Array.isArray(rule.review?.referenced_source_artifacts)
    ? rule.review.referenced_source_artifacts.map((item) => String(item))
    : [];
  const evidenceStatus = String(rule.review?.validation?.evidence_status ?? '');
  if (artifacts.length === 0 || evidenceStatus === 'missing') {
    return {
      status: 'fail',
      detail: 'No referenced source artifacts or evidence was marked missing.',
    };
  }
  if (evidenceStatus === 'partial') {
    return {
      status: 'warn',
      detail: 'Referenced source artifacts exist, but evidence is only partial.',
    };
  }
  if (evidenceStatus !== 'sufficient') {
    return {
      status: 'fail',
      detail: 'Evidence status is missing or unsupported.',
    };
  }
  return {
    status: 'pass',
    detail: 'Referenced source artifacts exist and evidence is sufficient.',
  };
};

const evaluateTelemetryLinkage = (rule) => {
  if (rule.review?.validation?.telemetry_linked === true) {
    return {
      status: 'pass',
      detail: 'Rule is explicitly linked to telemetry or runtime-summary evidence.',
    };
  }
  return {
    status: 'fail',
    detail: 'Rule is not linked to telemetry or runtime-summary evidence.',
  };
};

const evaluateClassification = (rule) => {
  const classification = String(rule.review?.validated_classification ?? '');
  if (!SUPPORTED_CLASSIFICATIONS.has(classification)) {
    return {
      status: 'fail',
      detail: 'Validated classification is unsupported or missing.',
      classification_lane: '',
    };
  }
  return {
    status: 'pass',
    detail: 'Validated classification is explicit and supported.',
    classification_lane: classificationLane(classification),
  };
};

const evaluateThresholdRationale = (rule) => {
  const thresholdBasis = String(rule.review?.validation?.threshold_basis ?? '');
  const rationale = String(rule.review?.rationale ?? '').trim();
  if (rationale === '') {
    return {
      status: 'fail',
      detail: 'Reviewer rationale is missing.',
    };
  }
  if (thresholdBasis === 'initial-assumption') {
    return {
      status: 'warn',
      detail: 'Threshold rationale exists, but the basis remains an initial assumption.',
    };
  }
  if (['source-backed', 'empirical', 'not-applicable'].includes(thresholdBasis)) {
    return {
      status: 'pass',
      detail: `Threshold rationale is present and the basis is ${thresholdBasis}.`,
    };
  }
  return {
    status: 'fail',
    detail: 'Threshold basis is missing or unsupported.',
  };
};

const evaluateExpertApproval = (rule, reviewer) => {
  const reasonCodes = Array.isArray(rule.review?.reason_codes)
    ? rule.review.reason_codes.map((item) => String(item))
    : [];
  if (!reviewer.name || !reviewer.role || !reviewer.reviewed_at) {
    return {
      status: 'fail',
      detail: 'Reviewer identity is incomplete for expert approval.',
    };
  }
  if (!['promote', 'hold', 'reject'].includes(String(rule.review?.decision ?? ''))) {
    return {
      status: 'fail',
      detail: 'Reviewer decision is missing.',
    };
  }
  if (reasonCodes.length === 0) {
    return {
      status: 'fail',
      detail: 'Expert approval is missing review reason codes.',
    };
  }
  return {
    status: 'pass',
    detail: 'Reviewer identity, decision, and reason codes are present.',
  };
};

const buildSummary = (results) => {
  const summary = {
    pass: 0,
    warn: 0,
    fail: 0,
    promotionReady: 0,
    reviewedRules: results.length,
  };
  for (const result of results) {
    summary[result.overallStatus] += 1;
    if (result.promotionEligible && result.overallStatus === 'pass') {
      summary.promotionReady += 1;
    }
  }
  return summary;
};

const aggregateStatus = (checks) => {
  const statuses = Object.values(checks).map((check) => check.status);
  if (statuses.includes('fail')) {
    return 'fail';
  }
  if (statuses.includes('warn')) {
    return 'warn';
  }
  return 'pass';
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

const normalizeReviewer = (reviewer) => ({
  name: String(reviewer?.name ?? ''),
  role: String(reviewer?.role ?? ''),
  reviewed_at: String(reviewer?.reviewed_at ?? ''),
});

const validateReviewedArtifact = (reviewedArtifact) => {
  if (!Array.isArray(reviewedArtifact?.reviewed_rules) || reviewedArtifact.reviewed_rules.length === 0) {
    throw new Error('Reviewed artifact must contain a non-empty reviewed_rules array');
  }
};

const readJson = (sourcePath) => JSON.parse(fs.readFileSync(sourcePath, 'utf-8'));

const readOptionValue = (argv, index, option) => {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${option} requires a value`);
  }
  return value;
};
