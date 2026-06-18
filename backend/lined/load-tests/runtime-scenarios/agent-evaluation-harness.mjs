import fs from 'node:fs';
import path from 'node:path';

export const HARNESS_SCHEMA_VERSION = 1;
export const HARNESS_WORKFLOW_VERSION = 'agent-evaluation-harness-v1';
export const SUBMISSION_SCHEMA_VERSION = 1;
export const SUBMISSION_WORKFLOW_VERSION = 'agent-evaluation-submission-v1';

const CASE_OUTPUT_TYPES = new Set(['rule-suggestions', 'research-summary']);
const REPORT_OUTPUT_FILE = 'agent-evaluation-report.json';

export const parseHarnessArgs = (argv) => {
  const options = {
    casesJson: undefined,
    outputDir: undefined,
    submissionJson: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      return { ...options, help: true };
    }
    if (arg === '--cases-json') {
      options.casesJson = readOptionValue(argv, index, arg);
      index += 1;
    } else if (arg === '--submission-json') {
      options.submissionJson = readOptionValue(argv, index, arg);
      index += 1;
    } else if (arg === '--output-dir') {
      options.outputDir = readOptionValue(argv, index, arg);
      index += 1;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  validateHarnessOptions(options);
  return options;
};

export const printHarnessHelp = () => `Usage:
  node load-tests/runtime-scenarios/agent-evaluation-harness-cli.mjs [options]

Options:
  --cases-json <path>        Versioned evaluation cases artifact
  --submission-json <path>   agent-evaluation-submission.json input
  --output-dir <dir>         Directory for agent-evaluation-report.json
`;

export const validateHarnessOptions = (options) => {
  if (!options.casesJson) {
    throw new Error('--cases-json is required');
  }
  if (!options.submissionJson) {
    throw new Error('--submission-json is required');
  }
  if (!options.outputDir) {
    throw new Error('--output-dir is required');
  }
};

export const writeAgentEvaluationReport = (options) => {
  const report = buildAgentEvaluationReport({
    casesArtifact: readJson(options.casesJson),
    casesArtifactPath: options.casesJson,
    repoRoot: process.cwd(),
    submissionArtifact: readJson(options.submissionJson),
    submissionArtifactPath: options.submissionJson,
  });

  fs.mkdirSync(options.outputDir, { recursive: true });
  const outputPath = path.join(options.outputDir, REPORT_OUTPUT_FILE);
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n', 'utf-8');

  return {
    outputPath,
    report,
    status: report.summary.overall_status,
  };
};

export const buildAgentEvaluationReport = ({
  casesArtifact,
  casesArtifactPath,
  repoRoot = process.cwd(),
  submissionArtifact,
  submissionArtifactPath,
  now = new Date(),
}) => {
  validateCasesArtifact(casesArtifact);
  validateSubmissionArtifact(submissionArtifact);

  const evaluationCase = casesArtifact.cases.find((current) => current.id === submissionArtifact.case_id);
  if (!evaluationCase) {
    throw new Error(`Submission case_id ${submissionArtifact.case_id} was not found in the cases artifact`);
  }
  if (evaluationCase.output_type !== submissionArtifact.output_type) {
    throw new Error(
      `Submission output_type ${submissionArtifact.output_type} does not match case output_type ${evaluationCase.output_type}`
    );
  }

  const findings = [];
  const allowedSourceIds = new Set(evaluationCase.sources.map((source) => String(source.source_id)));
  const declaredSources = new Map(
    evaluationCase.sources.map((source) => [String(source.source_id), normalizeCaseSource(source, repoRoot)])
  );
  const loadedSources = submissionArtifact.loaded_sources.map((source) => normalizeSubmissionSource(source, repoRoot));

  findings.push(checkFixtureFreshness(casesArtifact, now));
  findings.push(checkCaseSourcePaths(declaredSources));
  findings.push(checkLoadedSources(evaluationCase, loadedSources, declaredSources, allowedSourceIds));
  if (evaluationCase.output_type === 'rule-suggestions') {
    findings.push(...evaluateRuleSuggestions(evaluationCase, submissionArtifact.output, allowedSourceIds));
  } else {
    findings.push(...evaluateResearchSummary(evaluationCase, submissionArtifact.output, allowedSourceIds));
  }

  const blockingFailures = findings.filter((finding) => finding.blocking && finding.status === 'fail');
  const nonBlockingFindings = findings.filter((finding) => !finding.blocking && finding.status !== 'pass');

  return {
    schema_version: HARNESS_SCHEMA_VERSION,
    workflow_version: HARNESS_WORKFLOW_VERSION,
    generated_at: now.toISOString(),
    cases_artifact_path: casesArtifactPath,
    submission_artifact_path: submissionArtifactPath,
    evaluation_case: {
      id: evaluationCase.id,
      title: evaluationCase.title,
      output_type: evaluationCase.output_type,
    },
    fixture_status: fixtureStatus(casesArtifact, now),
    findings,
    summary: {
      blocking_findings: blockingFailures.length,
      non_blocking_findings: nonBlockingFindings.length,
      overall_status: blockingFailures.length === 0 ? 'pass' : 'fail',
    },
  };
};

const evaluateRuleSuggestions = (evaluationCase, output, allowedSourceIds) => {
  validateRuleSuggestionOutput(output);
  const expectations = evaluationCase.expectations;
  const candidateRules = output.candidate_rules;
  const summary = String(output.summary ?? '');
  const metrics = new Set(candidateRules.map((rule) => String(rule.metric)));
  const classifications = new Set(candidateRules.map((rule) => String(rule.classification)));
  const scenarioScopes = new Set(candidateRules.flatMap((rule) => rule.scenario_scope.map((item) => String(item))));
  const ruleSourceIds = new Set(candidateRules.flatMap((rule) => rule.source_ids.map((item) => String(item))));

  return [
    phraseCheck({
      actual: summary,
      blocking: true,
      detailPrefix: 'Rule summary',
      expectedPhrases: expectations.required_summary_phrases,
      findingId: 'rule-summary-phrases',
    }),
    setMembershipCheck({
      actual: metrics,
      blocking: true,
      expected: expectations.required_rule_metrics,
      findingId: 'rule-metrics',
      label: 'Rule metrics',
    }),
    setMembershipCheck({
      actual: classifications,
      blocking: true,
      expected: expectations.required_rule_classifications,
      findingId: 'rule-classifications',
      label: 'Rule classifications',
    }),
    setMembershipCheck({
      actual: scenarioScopes,
      blocking: true,
      expected: expectations.required_rule_scenarios,
      findingId: 'rule-scenarios',
      label: 'Rule scenario scopes',
    }),
    subsetCheck({
      actual: ruleSourceIds,
      allowed: allowedSourceIds,
      blocking: true,
      findingId: 'rule-source-boundary',
      label: 'Rule source references',
    }),
    setMembershipCheck({
      actual: ruleSourceIds,
      blocking: true,
      expected: expectations.required_rule_source_ids,
      findingId: 'rule-required-sources',
      label: 'Rule required source references',
    }),
    {
      blocking: true,
      detail: candidateRules.every((rule) => rule.requires_human_approval === true)
        ? 'Every candidate rule keeps human approval explicit.'
        : 'At least one candidate rule dropped the human-approval requirement.',
      id: 'rule-human-approval',
      status: candidateRules.every((rule) => rule.requires_human_approval === true) ? 'pass' : 'fail',
    },
    {
      blocking: true,
      detail: candidateRules.every((rule) => rule.scenario_scope.length > 0 && rule.source_ids.length > 0)
        ? 'Every candidate rule carries scenario scope and source references.'
        : 'At least one candidate rule is missing scenario scope or source references.',
      id: 'rule-per-candidate-provenance',
      status: candidateRules.every((rule) => rule.scenario_scope.length > 0 && rule.source_ids.length > 0)
        ? 'pass'
        : 'fail',
    },
    checkPerCandidateRuleContract(candidateRules, expectations, allowedSourceIds),
    checkRequiredRuleContracts(candidateRules, expectations),
  ];
};

const evaluateResearchSummary = (evaluationCase, output, allowedSourceIds) => {
  validateResearchSummaryOutput(output);
  const expectations = evaluationCase.expectations;

  return [
    phraseCheck({
      actual: String(output.summary ?? ''),
      blocking: true,
      detailPrefix: 'Research summary',
      expectedPhrases: expectations.required_summary_phrases,
      findingId: 'research-summary-phrases',
    }),
    arrayPhraseCheck({
      actual: output.key_claims,
      blocking: true,
      detailPrefix: 'Research key claims',
      expectedPhrases: expectations.required_claim_phrases,
      findingId: 'research-claim-phrases',
    }),
    arrayPhraseCheck({
      actual: output.limitations,
      blocking: true,
      detailPrefix: 'Research limitations',
      expectedPhrases: expectations.required_limitation_phrases,
      findingId: 'research-limitation-phrases',
    }),
    arrayPhraseCheck({
      actual: output.next_actions,
      blocking: true,
      detailPrefix: 'Research next actions',
      expectedPhrases: expectations.required_next_action_phrases,
      findingId: 'research-next-action-phrases',
    }),
    arrayPhraseCheck({
      actual: output.uncertainty_notes,
      blocking: true,
      detailPrefix: 'Research uncertainty notes',
      expectedPhrases: expectations.required_uncertainty_phrases,
      findingId: 'research-uncertainty-phrases',
    }),
    subsetCheck({
      actual: new Set(output.referenced_source_ids.map((item) => String(item))),
      allowed: allowedSourceIds,
      blocking: true,
      findingId: 'research-source-boundary',
      label: 'Research referenced sources',
    }),
    setMembershipCheck({
      actual: new Set(output.referenced_source_ids.map((item) => String(item))),
      blocking: true,
      expected: expectations.required_referenced_source_ids,
      findingId: 'research-required-sources',
      label: 'Research required referenced sources',
    }),
  ];
};

const checkFixtureFreshness = (casesArtifact, now) => {
  const status = fixtureStatus(casesArtifact, now);
  return {
    blocking: false,
    detail: status.status === 'stale'
      ? `Fixture set is stale as of ${status.stale_after}; refresh the local Notion excerpts when the live pages change.`
      : `Fixture set is current through ${status.stale_after}.`,
    id: 'fixture-freshness',
    status: status.status === 'stale' ? 'warn' : 'pass',
  };
};

const checkPerCandidateRuleContract = (candidateRules, expectations, allowedSourceIds) => {
  const expectedMetrics = new Set(expectations.required_rule_metrics.map((item) => String(item)));
  const expectedClassifications = new Set(
    expectations.required_rule_classifications.map((item) => String(item))
  );
  const expectedScenarios = new Set(expectations.required_rule_scenarios.map((item) => String(item)));

  const invalidRules = candidateRules.flatMap((rule, index) => {
    const issues = [];
    const metric = String(rule.metric ?? '');
    const classification = String(rule.classification ?? '');
    const scenarios = rule.scenario_scope.map((item) => String(item));
    const sources = rule.source_ids.map((item) => String(item));

    if (!expectedMetrics.has(metric)) {
      issues.push(`metric ${metric || '<missing>'}`);
    }
    if (!expectedClassifications.has(classification)) {
      issues.push(`classification ${classification || '<missing>'}`);
    }
    if (scenarios.some((scenario) => !expectedScenarios.has(scenario))) {
      issues.push(`scenario_scope ${JSON.stringify(rule.scenario_scope)}`);
    }
    if (sources.some((sourceId) => !allowedSourceIds.has(sourceId))) {
      issues.push(`source_ids ${JSON.stringify(rule.source_ids)}`);
    }
    if (rule.requires_human_approval !== true) {
      issues.push('requires_human_approval false');
    }

    return issues.length === 0 ? [] : [`rule ${index + 1}: ${issues.join(', ')}`];
  });

  return {
    blocking: true,
    detail: invalidRules.length === 0
      ? 'Every candidate rule stays inside the case-local metric, classification, scenario, source, and review contract.'
      : `Candidate rules outside the per-item contract: ${invalidRules.join('; ')}`,
    id: 'rule-per-candidate-contract',
    status: invalidRules.length === 0 ? 'pass' : 'fail',
  };
};

const checkRequiredRuleContracts = (candidateRules, expectations) => {
  const invalidRules = [];
  const unmatchedRules = [];
  const contracts = expectations.required_rule_contracts.map((contract) => ({
    classification: String(contract.classification),
    metric: String(contract.metric),
    required_scenarios: new Set(contract.required_scenarios.map((item) => String(item))),
    required_source_ids: new Set(contract.required_source_ids.map((item) => String(item))),
  }));

  for (const contract of contracts) {
    const matchedRules = candidateRules.filter((rule) => (
      String(rule.metric) === contract.metric && String(rule.classification) === contract.classification
    ));
    if (matchedRules.length !== 1) {
      invalidRules.push(
        `${contract.metric}/${contract.classification} expected exactly once but found ${matchedRules.length}`
      );
      continue;
    }

    const matchedRule = matchedRules[0];
    if (!matchedRule) {
      invalidRules.push(`${contract.metric}/${contract.classification} missing`);
      continue;
    }

    const scenarios = new Set(matchedRule.scenario_scope.map((item) => String(item)));
    const sources = new Set(matchedRule.source_ids.map((item) => String(item)));
    const missingScenarios = [...contract.required_scenarios].filter((item) => !scenarios.has(item));
    const missingSources = [...contract.required_source_ids].filter((item) => !sources.has(item));

    if (missingScenarios.length > 0 || missingSources.length > 0 || matchedRule.requires_human_approval !== true) {
      const details = [];
      if (missingScenarios.length > 0) {
        details.push(`missing scenarios ${missingScenarios.join(', ')}`);
      }
      if (missingSources.length > 0) {
        details.push(`missing sources ${missingSources.join(', ')}`);
      }
      if (matchedRule.requires_human_approval !== true) {
        details.push('requires_human_approval false');
      }
      invalidRules.push(`${contract.metric}/${contract.classification}: ${details.join(', ')}`);
    }
  }

  for (const rule of candidateRules) {
    const matchesContract = contracts.some((contract) => (
      String(rule.metric) === contract.metric && String(rule.classification) === contract.classification
    ));
    if (!matchesContract) {
      unmatchedRules.push(`${String(rule.metric)}/${String(rule.classification)}`);
    }
  }

  return {
    blocking: true,
    detail: invalidRules.length === 0 && unmatchedRules.length === 0 && candidateRules.length === contracts.length
      ? 'Candidate rules satisfy every expected per-rule tuple in the selected case.'
      : `Candidate rules violated expected per-rule tuples: ${[
        ...invalidRules,
        ...(candidateRules.length !== contracts.length
          ? [`expected ${contracts.length} candidate rules but found ${candidateRules.length}`]
          : []),
        ...(unmatchedRules.length > 0 ? [`unexpected tuples ${unmatchedRules.join(', ')}`] : []),
      ].join('; ')}`,
    id: 'rule-required-contracts',
    status: invalidRules.length === 0 && unmatchedRules.length === 0 && candidateRules.length === contracts.length
      ? 'pass'
      : 'fail',
  };
};

const checkLoadedSources = (evaluationCase, loadedSources, declaredSources, allowedSourceIds) => {
  const loadedSourceIds = new Set(loadedSources.map((source) => source.source_id));
  const missing = evaluationCase.expectations.required_loaded_source_ids
    .filter((item) => !loadedSourceIds.has(String(item)));
  if (missing.length > 0) {
    return {
      blocking: true,
      detail: `Submission omitted required loaded sources: ${missing.join(', ')}`,
      id: 'loaded-source-contract',
      status: 'fail',
    };
  }
  const unexpected = [...loadedSourceIds].filter((item) => !allowedSourceIds.has(item));
  if (unexpected.length > 0) {
    return {
      blocking: true,
      detail: `Submission referenced undeclared loaded sources: ${unexpected.join(', ')}`,
      id: 'loaded-source-contract',
      status: 'fail',
    };
  }
  const mismatches = loadedSources
    .map((loadedSource) => compareLoadedSource(loadedSource, declaredSources.get(loadedSource.source_id)))
    .filter((detail) => detail);
  if (mismatches.length > 0) {
    return {
      blocking: true,
      detail: `Submission source metadata mismatched the case contract: ${mismatches.join('; ')}`,
      id: 'loaded-source-contract',
      status: 'fail',
    };
  }
  return {
    blocking: true,
    detail: 'Submission loaded every required source and stayed within the case boundary.',
    id: 'loaded-source-contract',
    status: 'pass',
  };
};

const checkCaseSourcePaths = (declaredSources) => {
  const missingPaths = [...declaredSources.values()]
    .filter((source) => !fs.existsSync(source.absolute_path))
    .map((source) => `${source.source_id}=>${source.path}`);
  return {
    blocking: true,
    detail: missingPaths.length === 0
      ? 'Every case source path exists at evaluation time.'
      : `Case sources reference missing local paths: ${missingPaths.join(', ')}`,
    id: 'case-source-paths',
    status: missingPaths.length === 0 ? 'pass' : 'fail',
  };
};

const fixtureStatus = (casesArtifact, now) => {
  const refreshedAt = new Date(String(casesArtifact.refreshed_at));
  const staleAfter = new Date(refreshedAt.getTime() + Number(casesArtifact.stale_after_days) * 24 * 60 * 60 * 1000);
  return {
    refreshed_at: refreshedAt.toISOString(),
    stale_after: staleAfter.toISOString(),
    status: now.getTime() > staleAfter.getTime() ? 'stale' : 'current',
  };
};

const setMembershipCheck = ({
  actual,
  blocking,
  expected,
  findingId,
  label,
}) => {
  const missing = expected.filter((item) => !actual.has(String(item)));
  return {
    blocking,
    detail: missing.length === 0
      ? `${label} cover every expected value.`
      : `${label} are missing: ${missing.join(', ')}`,
    id: findingId,
    status: missing.length === 0 ? 'pass' : 'fail',
  };
};

const subsetCheck = ({
  actual,
  allowed,
  blocking,
  findingId,
  label,
}) => {
  const unexpected = [...actual].filter((item) => !allowed.has(item));
  return {
    blocking,
    detail: unexpected.length === 0
      ? `${label} stayed inside the case-local source boundary.`
      : `${label} included undeclared source ids: ${unexpected.join(', ')}`,
    id: findingId,
    status: unexpected.length === 0 ? 'pass' : 'fail',
  };
};

const phraseCheck = ({
  actual,
  blocking,
  detailPrefix,
  expectedPhrases,
  findingId,
}) => {
  const missing = expectedPhrases.filter((phrase) => !actual.toLowerCase().includes(String(phrase).toLowerCase()));
  return {
    blocking,
    detail: missing.length === 0
      ? `${detailPrefix} covers every expected phrase.`
      : `${detailPrefix} is missing expected phrases: ${missing.join(', ')}`,
    id: findingId,
    status: missing.length === 0 ? 'pass' : 'fail',
  };
};

const arrayPhraseCheck = ({
  actual,
  blocking,
  detailPrefix,
  expectedPhrases,
  findingId,
}) => phraseCheck({
  actual: actual.join('\n'),
  blocking,
  detailPrefix,
  expectedPhrases,
  findingId,
});

const validateCasesArtifact = (artifact) => {
  if (artifact?.schema_version !== HARNESS_SCHEMA_VERSION) {
    throw new Error(`Cases artifact must declare schema_version ${HARNESS_SCHEMA_VERSION}`);
  }
  if (artifact?.workflow_version !== HARNESS_WORKFLOW_VERSION) {
    throw new Error(`Cases artifact must declare workflow_version ${HARNESS_WORKFLOW_VERSION}`);
  }
  if (!Array.isArray(artifact?.cases) || artifact.cases.length === 0) {
    throw new Error('Cases artifact must define a non-empty cases array');
  }
  if (!Number.isInteger(artifact?.stale_after_days) || artifact.stale_after_days <= 0) {
    throw new Error('Cases artifact must define a positive stale_after_days value');
  }
  for (const evaluationCase of artifact.cases) {
    if (!CASE_OUTPUT_TYPES.has(String(evaluationCase.output_type))) {
      throw new Error(`Case ${evaluationCase.id} has unsupported output_type ${evaluationCase.output_type}`);
    }
    if (!Array.isArray(evaluationCase.sources) || evaluationCase.sources.length === 0) {
      throw new Error(`Case ${evaluationCase.id} must declare sources`);
    }
    for (const source of evaluationCase.sources) {
      validateCaseSource(evaluationCase.id, source);
    }
    validateExpectations(evaluationCase);
  }
};

const validateExpectations = (evaluationCase) => {
  const expectations = evaluationCase.expectations;
  if (!expectations || !Array.isArray(expectations.required_loaded_source_ids)) {
    throw new Error(`Case ${evaluationCase.id} must declare required_loaded_source_ids`);
  }
  if (evaluationCase.output_type === 'rule-suggestions') {
    for (const key of [
      'required_rule_metrics',
      'required_rule_classifications',
      'required_rule_scenarios',
      'required_rule_source_ids',
      'required_rule_contracts',
      'required_summary_phrases',
    ]) {
      if (!Array.isArray(expectations[key])) {
        throw new Error(`Case ${evaluationCase.id} must declare ${key}`);
      }
    }
    for (const contract of expectations.required_rule_contracts) {
      if (!contract || typeof contract !== 'object') {
        throw new Error(`Case ${evaluationCase.id} must define object entries in required_rule_contracts`);
      }
      for (const field of ['metric', 'classification']) {
        if (typeof contract[field] !== 'string' || contract[field].trim() === '') {
          throw new Error(`Case ${evaluationCase.id} rule contracts must define ${field}`);
        }
      }
      for (const field of ['required_scenarios', 'required_source_ids']) {
        if (!Array.isArray(contract[field]) || contract[field].length === 0) {
          throw new Error(`Case ${evaluationCase.id} rule contracts must define ${field}`);
        }
      }
    }
    return;
  }
  for (const key of [
    'required_summary_phrases',
    'required_claim_phrases',
    'required_limitation_phrases',
    'required_next_action_phrases',
    'required_uncertainty_phrases',
    'required_referenced_source_ids',
  ]) {
    if (!Array.isArray(expectations[key])) {
      throw new Error(`Case ${evaluationCase.id} must declare ${key}`);
    }
  }
};

const validateSubmissionArtifact = (artifact) => {
  if (artifact?.schema_version !== SUBMISSION_SCHEMA_VERSION) {
    throw new Error(`Submission artifact must declare schema_version ${SUBMISSION_SCHEMA_VERSION}`);
  }
  if (artifact?.workflow_version !== SUBMISSION_WORKFLOW_VERSION) {
    throw new Error(`Submission artifact must declare workflow_version ${SUBMISSION_WORKFLOW_VERSION}`);
  }
  if (!CASE_OUTPUT_TYPES.has(String(artifact?.output_type))) {
    throw new Error(`Submission output_type must be one of: ${[...CASE_OUTPUT_TYPES].join(', ')}`);
  }
  if (!Array.isArray(artifact?.loaded_sources) || artifact.loaded_sources.length === 0) {
    throw new Error('Submission artifact must declare loaded_sources');
  }
  if (!artifact?.output || typeof artifact.output !== 'object') {
    throw new Error('Submission artifact must declare output');
  }
};

const validateCaseSource = (caseId, source) => {
  for (const field of ['source_id', 'kind', 'path']) {
    if (typeof source?.[field] !== 'string' || source[field].trim() === '') {
      throw new Error(`Case ${caseId} must define non-empty source ${field} values`);
    }
  }
};

const validateRuleSuggestionOutput = (output) => {
  if (!Array.isArray(output?.candidate_rules) || output.candidate_rules.length === 0) {
    throw new Error('Rule-suggestions output must contain candidate_rules');
  }
  for (const rule of output.candidate_rules) {
    if (!Array.isArray(rule?.scenario_scope) || !Array.isArray(rule?.source_ids)) {
      throw new Error('Every candidate rule must declare scenario_scope and source_ids arrays');
    }
  }
};

const validateResearchSummaryOutput = (output) => {
  for (const key of ['key_claims', 'limitations', 'next_actions', 'referenced_source_ids', 'uncertainty_notes']) {
    if (!Array.isArray(output?.[key])) {
      throw new Error(`Research-summary output must declare ${key}`);
    }
  }
};

const normalizeCaseSource = (source, repoRoot) => ({
  absolute_path: resolveRepoPath(String(source.path ?? ''), repoRoot),
  kind: String(source.kind ?? ''),
  path: String(source.path ?? ''),
  source_id: String(source.source_id ?? ''),
});

const normalizeSubmissionSource = (source, repoRoot) => ({
  absolute_path: resolveRepoPath(String(source.path ?? ''), repoRoot),
  kind: String(source.kind ?? ''),
  path: String(source.path ?? ''),
  source_id: String(source.source_id ?? ''),
});

const compareLoadedSource = (loadedSource, declaredSource) => {
  if (!declaredSource) {
    return `missing case source for ${loadedSource.source_id}`;
  }
  if (loadedSource.kind !== declaredSource.kind) {
    return `${loadedSource.source_id} kind expected ${declaredSource.kind} but got ${loadedSource.kind}`;
  }
  if (loadedSource.absolute_path !== declaredSource.absolute_path) {
    return `${loadedSource.source_id} path expected ${declaredSource.path} but got ${loadedSource.path}`;
  }
  return '';
};

const readOptionValue = (argv, index, option) => {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${option} requires a value`);
  }
  return value;
};

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf-8'));

const resolveRepoPath = (value, repoRoot) => (
  path.isAbsolute(value) ? path.normalize(value) : path.resolve(repoRoot, value)
);

export const reportOutputFile = () => REPORT_OUTPUT_FILE;
