import fs from 'node:fs';
import path from 'node:path';

export const ADVISORY_SCHEMA_VERSION = 1;
export const ADVISORY_VERSION = 'llm-support-service-prototype-v1';
export const DEFAULT_PROVIDER = 'mock';
export const DEFAULT_OPENAI_MODEL = 'gpt-5.5';
const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const OUTPUT_FILE = 'candidate-rule-suggestions.json';
const REQUIREMENT_CHAR_LIMIT = 6000;
const MAX_REQUIREMENT_DOCS = 4;
const MAX_RUNTIME_SUMMARIES = 8;

export const OUTPUT_SCHEMA = Object.freeze({
  type: 'object',
  properties: {
    source_artifacts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          artifactType: { type: 'string' },
          identity: { type: 'string' },
          path: { type: 'string' },
        },
        required: ['artifactType', 'path'],
        additionalProperties: false,
      },
    },
    candidate_rules: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          classification: {
            type: 'string',
            enum: [
              'objective',
              'objective-with-constraint',
              'hard-constraint',
              'warning',
              'context-signal',
              'validation-evidence',
              'exploratory',
            ],
          },
          metric: { type: 'string' },
          direction: {
            type: 'string',
            enum: ['minimize', 'maximize', 'observe', 'validate'],
          },
          constraint: { type: 'string' },
          rationale: { type: 'string' },
          evidence: { type: 'string' },
          scenarioScope: {
            type: 'array',
            items: { type: 'string' },
          },
          requires_human_approval: { type: 'boolean' },
        },
        required: [
          'name',
          'classification',
          'metric',
          'direction',
          'constraint',
          'rationale',
          'evidence',
          'scenarioScope',
          'requires_human_approval',
        ],
        additionalProperties: false,
      },
    },
    tradeoff_explanations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          scenario: { type: 'string' },
          summary: { type: 'string' },
        },
        required: ['scenario', 'summary'],
        additionalProperties: false,
      },
    },
    review_notes: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: [
    'source_artifacts',
    'candidate_rules',
    'tradeoff_explanations',
    'review_notes',
  ],
  additionalProperties: false,
});

const PROVIDERS = Object.freeze(['mock', 'openai']);

export const parseSupportArgs = (argv) => {
  const options = {
    model: DEFAULT_OPENAI_MODEL,
    outputDir: undefined,
    provider: DEFAULT_PROVIDER,
    requirementsMd: [],
    runtimeSummary: [],
    scenarioCatalogJson: undefined,
    sloJson: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      return { ...options, help: true };
    }
    if (arg === '--requirements-md') {
      options.requirementsMd.push(readOptionValue(argv, index, arg));
      index += 1;
    } else if (arg === '--runtime-summary') {
      options.runtimeSummary.push(readOptionValue(argv, index, arg));
      index += 1;
    } else if (arg === '--slo-json') {
      options.sloJson = readOptionValue(argv, index, arg);
      index += 1;
    } else if (arg === '--scenario-catalog-json') {
      options.scenarioCatalogJson = readOptionValue(argv, index, arg);
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

  validateSupportOptions(options);
  return options;
};

export const printSupportHelp = () => `Usage:
  node load-tests/runtime-scenarios/llm-support-service-cli.mjs [options]

Options:
  --requirements-md <path>        Markdown requirements or ADR excerpt; repeatable
  --runtime-summary <path>        runtime-summary.json artifact; repeatable
  --slo-json <path>               slo-thresholds-v1.json input
  --scenario-catalog-json <path>  runtime-quality-scenarios-v1.json input
  --provider <mock|openai>        Advisory provider, default: mock
  --model <name>                  OpenAI model for --provider openai
  --output-dir <dir>              Directory for advisory output
`;

export const validateSupportOptions = (options) => {
  if (!options.outputDir) {
    throw new Error('--output-dir is required');
  }
  if (options.requirementsMd.length === 0) {
    throw new Error('At least one --requirements-md input is required');
  }
  if (options.runtimeSummary.length === 0) {
    throw new Error('At least one --runtime-summary input is required');
  }
  if (!options.sloJson) {
    throw new Error('--slo-json is required');
  }
  if (!PROVIDERS.includes(options.provider)) {
    throw new Error(`--provider must be one of: ${PROVIDERS.join(', ')}`);
  }
};

export const readSupportInputs = (options) => ({
  requirements: options.requirementsMd.map((sourcePath) => ({
    sourcePath,
    value: fs.readFileSync(sourcePath, 'utf-8'),
  })),
  runtimeSummaries: options.runtimeSummary.map((sourcePath) => ({
    sourcePath,
    value: readJson(sourcePath),
  })),
  scenarioCatalog: options.scenarioCatalogJson ? {
    sourcePath: options.scenarioCatalogJson,
    value: readJson(options.scenarioCatalogJson),
  } : undefined,
  sloThresholds: {
    sourcePath: options.sloJson,
    value: readJson(options.sloJson),
  },
});

export const writeLlmSupportAdvisory = async (options, dependencies = {}) => {
  const advisory = await buildLlmSupportAdvisory({
    ...readSupportInputs(options),
    model: options.model,
    provider: options.provider,
  }, dependencies);

  fs.mkdirSync(options.outputDir, { recursive: true });
  const outputPath = path.join(options.outputDir, OUTPUT_FILE);
  fs.writeFileSync(outputPath, JSON.stringify(advisory, null, 2) + '\n', 'utf-8');
  return {
    advisory,
    outputPath,
  };
};

export const buildLlmSupportAdvisory = async (inputs, dependencies = {}) => {
  validateSupportInputs(inputs);
  const artifactIndex = buildArtifactIndex(inputs);
  const advisoryCore = inputs.provider === 'openai'
    ? await buildOpenAiAdvisory(inputs, dependencies, artifactIndex)
    : buildMockAdvisory(inputs, artifactIndex);

  return {
    generated_at: new Date().toISOString(),
    model: inputs.provider === 'openai' ? inputs.model : 'deterministic-mock-v1',
    provider: inputs.provider,
    prototype_version: ADVISORY_VERSION,
    schema_version: ADVISORY_SCHEMA_VERSION,
    ...normalizeAdvisory(advisoryCore, artifactIndex),
  };
};

export const buildOpenAiRequest = (inputs) => ({
  model: inputs.model,
  input: buildPrompt(inputs),
  text: {
    format: {
      type: 'json_schema',
      name: 'llm_support_advisory',
      strict: true,
      schema: OUTPUT_SCHEMA,
    },
  },
});

export const extractOpenAiOutputText = (responseBody) => {
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

const buildOpenAiAdvisory = async (inputs, dependencies, artifactIndex) => {
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
    body: JSON.stringify(buildOpenAiRequest(inputs)),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI Responses API request failed (${response.status}): ${body}`);
  }
  const responseBody = await response.json();
  const parsed = JSON.parse(extractOpenAiOutputText(responseBody));
  return normalizeAdvisory(parsed, artifactIndex);
};

const buildMockAdvisory = (inputs, artifactIndex) => {
  const thresholds = inputs.sloThresholds.value.thresholds ?? [];
  const runtimeScenarioIds = Array.from(new Set(
    inputs.runtimeSummaries
      .slice(0, MAX_RUNTIME_SUMMARIES)
      .map(({ value }) => value.scenario)
      .filter(Boolean)
  ));
  const objectiveMetrics = objectiveMetricMap(inputs.scenarioCatalog?.value?.scenarios ?? []);
  const requirementKeywords = extractRequirementKeywords(inputs.requirements);
  const candidateRules = [
    ...thresholds.map((threshold) => thresholdToRule(threshold, runtimeScenarioIds, objectiveMetrics)),
    ...(inputs.sloThresholds.value.context_metrics ?? []).map((metric) => contextMetricToRule(metric, runtimeScenarioIds)),
  ];
  const tradeoffExplanations = inputs.runtimeSummaries
    .slice(0, MAX_RUNTIME_SUMMARIES)
    .map(({ value }) => ({
      scenario: value.scenario,
      summary: tradeoffSummary(value, requirementKeywords),
    }));

  return {
    source_artifacts: artifactIndex,
    candidate_rules: dedupeRules(candidateRules),
    tradeoff_explanations: dedupeTradeoffs(tradeoffExplanations),
    review_notes: [
      'All candidate rules are advisory only and require human approval before promotion.',
      'Threshold-backed rules should remain traceable to the supplied SLO artifact and runtime-summary evidence.',
      requirementKeywords.length > 0
        ? `Requirements emphasized: ${requirementKeywords.join(', ')}.`
        : 'Requirements excerpts did not yield stable keywords; review the source markdown before promoting rules.',
    ],
  };
};

const validateSupportInputs = (inputs) => {
  if (inputs.requirements.length === 0) {
    throw new Error('No requirements markdown inputs were supplied');
  }
  if (inputs.runtimeSummaries.length === 0) {
    throw new Error('No runtime summaries were supplied');
  }
  if (!inputs.sloThresholds?.value?.thresholds) {
    throw new Error('SLO thresholds input must contain a thresholds array');
  }
};

const buildArtifactIndex = (inputs) => {
  const requirementArtifacts = inputs.requirements
    .slice(0, MAX_REQUIREMENT_DOCS)
    .map(({ sourcePath }) => ({
      artifactType: 'requirements-md',
      path: sourcePath,
    }));
  const runtimeArtifacts = inputs.runtimeSummaries
    .slice(0, MAX_RUNTIME_SUMMARIES)
    .map(({ sourcePath, value }) => ({
      artifactType: 'runtime-summary',
      identity: candidateId(value.scenario, value.workload, value.source),
      path: sourcePath,
    }));
  const catalogArtifacts = inputs.scenarioCatalog ? [{
    artifactType: 'scenario-catalog-json',
    path: inputs.scenarioCatalog.sourcePath,
  }] : [];
  const sloArtifacts = [{
    artifactType: 'slo-json',
    path: inputs.sloThresholds.sourcePath,
  }];
  return [...requirementArtifacts, ...runtimeArtifacts, ...catalogArtifacts, ...sloArtifacts];
};

const buildPrompt = (inputs) => {
  const promptPayload = {
    contract: {
      prototype_version: ADVISORY_VERSION,
      scope: 'advisory only',
      required_output_schema: OUTPUT_SCHEMA,
    },
    requirements: inputs.requirements.slice(0, MAX_REQUIREMENT_DOCS).map(({ sourcePath, value }) => ({
      path: sourcePath,
      excerpt: sanitizeRequirement(value),
    })),
    runtime_summaries: inputs.runtimeSummaries.slice(0, MAX_RUNTIME_SUMMARIES).map(({ sourcePath, value }) => ({
      path: sourcePath,
      scenario: value.scenario,
      workload: value.workload,
      source: value.source,
      summary: value.summary,
      missing: value.missing ?? [],
    })),
    scenario_catalog: inputs.scenarioCatalog?.value ?? null,
    slo_thresholds: inputs.sloThresholds.value,
    instructions: [
      'Return only JSON matching the supplied schema.',
      'Treat all suggestions as advisory only and requiring human approval.',
      'Do not invent telemetry sources beyond the provided artifacts.',
      'Keep hard constraints, objectives, context signals, validation evidence, warnings, and exploratory evidence visibly distinct.',
    ],
  };
  return JSON.stringify(promptPayload, null, 2);
};

const normalizeAdvisory = (value, artifactIndex) => ({
  source_artifacts: normalizeArtifacts(value.source_artifacts, artifactIndex),
  candidate_rules: normalizeRules(value.candidate_rules),
  tradeoff_explanations: normalizeTradeoffs(value.tradeoff_explanations),
  review_notes: normalizeReviewNotes(value.review_notes),
});

const normalizeArtifacts = (artifacts, fallback) => {
  if (!Array.isArray(artifacts) || artifacts.length === 0) {
    return fallback;
  }
  return artifacts.map((artifact) => ({
    artifactType: String(artifact.artifactType),
    identity: artifact.identity ? String(artifact.identity) : undefined,
    path: String(artifact.path),
  }));
};

const normalizeRules = (rules) => {
  if (!Array.isArray(rules)) {
    throw new Error('candidate_rules must be an array');
  }
  return rules.map((rule) => ({
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
  }));
};

const normalizeTradeoffs = (tradeoffs) => {
  if (!Array.isArray(tradeoffs)) {
    return [];
  }
  return tradeoffs.map((tradeoff) => ({
    scenario: String(tradeoff.scenario),
    summary: String(tradeoff.summary),
  }));
};

const normalizeReviewNotes = (notes) => {
  if (!Array.isArray(notes)) {
    return [];
  }
  return notes.map((note) => String(note));
};

const thresholdToRule = (threshold, runtimeScenarioIds, objectiveMetrics) => {
  const metric = threshold.metric ?? threshold.evidence_source;
  return {
    name: humanizeRuleName(threshold.id),
    classification: thresholdClassification(threshold, objectiveMetrics.has(metric)),
    metric,
    direction: directionForThreshold(threshold),
    constraint: thresholdConstraint(threshold),
    rationale: threshold.rationale,
    evidence: threshold.source,
    scenarioScope: runtimeScenarioIds,
    requires_human_approval: true,
  };
};

const contextMetricToRule = (metric, runtimeScenarioIds) => ({
  name: humanizeRuleName(metric.metric),
  classification: 'context-signal',
  metric: metric.metric,
  direction: 'observe',
  constraint: '',
  rationale: metric.reason,
  evidence: 'slo-thresholds context metrics',
  scenarioScope: runtimeScenarioIds,
  requires_human_approval: true,
});

const thresholdClassification = (threshold, objectiveMetric) => {
  if (threshold.evidence_source) {
    return 'validation-evidence';
  }
  if (threshold.severity === 'warning') {
    return 'warning';
  }
  if (objectiveMetric) {
    return 'objective-with-constraint';
  }
  return 'hard-constraint';
};

const directionForThreshold = (threshold) => {
  if (threshold.evidence_source) {
    return 'validate';
  }
  if (threshold.operator === '<=' || threshold.operator === '<') {
    return 'minimize';
  }
  if (threshold.operator === '>=' || threshold.operator === '>') {
    return 'maximize';
  }
  if (threshold.value === 0) {
    return 'minimize';
  }
  return 'validate';
};

const thresholdConstraint = (threshold) => {
  const target = threshold.metric ?? threshold.evidence_source;
  return `${target} ${threshold.operator} ${threshold.value}`;
};

const objectiveMetricMap = (scenarios) => {
  const metrics = new Set();
  for (const scenario of scenarios) {
    if (!(scenario?.slo_or_constraint_roles ?? []).includes('objective')) {
      continue;
    }
    for (const metric of scenario.supported_runtime_summary_fields ?? []) {
      metrics.add(metric);
    }
  }
  return metrics;
};

const extractRequirementKeywords = (requirements) => {
  const keywords = new Set();
  for (const requirement of requirements.slice(0, MAX_REQUIREMENT_DOCS)) {
    const normalized = requirement.value.toLowerCase();
    for (const candidate of [
      'latency',
      'throughput',
      'error rate',
      'availability',
      'reliability',
      'scalability',
      'resource',
      'constraint',
      'objective',
      'quality attribute',
    ]) {
      if (normalized.includes(candidate)) {
        keywords.add(candidate);
      }
    }
  }
  return Array.from(keywords);
};

const tradeoffSummary = (runtimeSummary, requirementKeywords) => {
  const summary = runtimeSummary.summary ?? {};
  const observations = [];
  if (typeof summary.latency_p95_ms === 'number') {
    observations.push(`p95 latency ${summary.latency_p95_ms} ms`);
  }
  if (typeof summary.throughput_rps === 'number') {
    observations.push(`throughput ${summary.throughput_rps} req/s`);
  }
  if (typeof summary.cpu_utilization === 'number') {
    observations.push(`CPU ${roundPercent(summary.cpu_utilization)}`);
  }
  if (typeof summary.memory_utilization === 'number') {
    observations.push(`memory ${roundPercent(summary.memory_utilization)}`);
  }
  const focus = requirementKeywords.includes('scalability')
    ? 'Prioritize scalability review against the bounded workload evidence.'
    : 'Compare this scenario against the constrained local workload evidence before promotion.';
  return `${observations.join(', ')}. ${focus}`.trim();
};

const dedupeRules = (rules) => {
  const seen = new Set();
  return rules.filter((rule) => {
    const key = `${rule.classification}:${rule.metric}:${rule.constraint}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const dedupeTradeoffs = (tradeoffs) => {
  const seen = new Set();
  return tradeoffs.filter((tradeoff) => {
    if (seen.has(tradeoff.scenario)) {
      return false;
    }
    seen.add(tradeoff.scenario);
    return true;
  });
};

const sanitizeRequirement = (value) => value
  .replace(/\r\n/g, '\n')
  .replace(/[ \t]+\n/g, '\n')
  .trim()
  .slice(0, REQUIREMENT_CHAR_LIMIT);

const humanizeRuleName = (value) => value
  .replace(/[-_]/g, ' ')
  .replace(/\b\w/g, (char) => char.toUpperCase());

const candidateId = (scenario, workload, source) => [scenario, workload, source]
  .filter(Boolean)
  .join(':');

const readJson = (sourcePath) => JSON.parse(fs.readFileSync(sourcePath, 'utf-8'));

const readOptionValue = (argv, index, option) => {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${option} requires a value`);
  }
  return value;
};

const roundPercent = (value) => `${Math.round(value * 100)}%`;
