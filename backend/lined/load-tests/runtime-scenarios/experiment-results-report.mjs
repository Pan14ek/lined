import fs from 'node:fs';
import path from 'node:path';

export const REPORT_SCHEMA_VERSION = 1;
export const REPORT_VERSION = 'experiment-results-report-v1';

export const SCORE_LANES = Object.freeze([
  {
    field: 'fitnessScore',
    label: 'Structural fitness',
    versionField: undefined,
  },
  {
    field: 'runtimeFitnessScore',
    label: 'Runtime-aware fitness',
    versionField: 'runtimeFitnessScoreVersion',
  },
  {
    field: 'adaptiveFitnessScore',
    label: 'Adaptive weighted fitness',
    versionField: 'adaptiveFitnessScoreVersion',
  },
]);

const CANONICAL_SCENARIOS = Object.freeze(['fixed-medium', 'replicas-2', 'hpa-cpu']);

export const parseReportArgs = (argv) => {
  const options = {
    metricsJson: [],
    outputDir: undefined,
    runtimeManifest: [],
    runtimeSummary: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      return { ...options, help: true };
    }
    if (arg === '--metrics-json') {
      options.metricsJson.push(readOptionValue(argv, index, arg));
      index += 1;
    } else if (arg === '--runtime-summary') {
      options.runtimeSummary.push(readOptionValue(argv, index, arg));
      index += 1;
    } else if (arg === '--runtime-manifest') {
      options.runtimeManifest.push(readOptionValue(argv, index, arg));
      index += 1;
    } else if (arg === '--output-dir') {
      options.outputDir = readOptionValue(argv, index, arg);
      index += 1;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  validateReportOptions(options);
  return options;
};

export const printReportHelp = () => `Usage:
  node load-tests/runtime-scenarios/experiment-results-report-cli.mjs [options]

Options:
  --metrics-json <path>       Collector metrics document; repeatable
  --runtime-summary <path>    Collector-ready runtime-summary.json; repeatable
  --runtime-manifest <path>   runtime-summary-manifest.json provenance; repeatable
  --output-dir <dir>          Directory for report outputs
`;

export const validateReportOptions = (options) => {
  if (!options.outputDir) {
    throw new Error('--output-dir is required');
  }
  const evidenceCount = options.metricsJson.length
    + options.runtimeSummary.length
    + options.runtimeManifest.length;
  if (evidenceCount === 0) {
    throw new Error('At least one evidence artifact is required');
  }
};

export const buildExperimentResultsReport = ({ metricsDocuments, runtimeManifests, runtimeSummaries }) => {
  const metrics = ingestMetricsDocuments(metricsDocuments);
  const manifests = ingestRuntimeManifests(runtimeManifests);
  const runtime = ingestRuntimeSummaries(runtimeSummaries, manifests.byIdentity);
  const evidence = [...metrics.evidence, ...runtime.evidence, ...manifests.evidence];
  const includedRuntime = runtime.summaries.filter((summary) => summary.inclusionStatus === 'included');
  const includedMetrics = metrics.documents.filter((document) => document.inclusionStatus === 'included');
  const scoreRows = buildScoreRows(includedMetrics);
  const paretoRows = buildParetoRows(includedMetrics);
  const decisionRows = buildDecisionRows(includedMetrics);
  const canonicalComparison = buildCanonicalComparison(includedRuntime);
  const limitations = buildLimitations({
    canonicalComparison,
    decisionRows,
    evidence,
    paretoRows,
    runtime: includedRuntime,
  });

  return {
    schema_version: REPORT_SCHEMA_VERSION,
    reportVersion: REPORT_VERSION,
    canonicalComparison,
    evidence,
    outputs: [],
    tables: {
      decisionUsefulness: decisionRows,
      paretoCandidates: paretoRows,
      runtimeSummaries: includedRuntime.map((summary) => summary.row),
      scoreLanes: scoreRows,
    },
    limitations,
    markdown: renderMarkdown({
      decisionRows,
      evidence,
      limitations,
      paretoRows,
      runtimeRows: includedRuntime.map((summary) => summary.row),
      scoreRows,
    }),
    plots: {
      runtimeLatency: renderRuntimeLatencySvg(includedRuntime.map((summary) => summary.row)),
      scoreLanes: renderScoreLanesSvg(scoreRows),
    },
  };
};

export const writeExperimentResultsReport = (options) => {
  const metricsDocuments = options.metricsJson.map((sourcePath) => ({
    sourcePath,
    value: readJson(sourcePath),
  }));
  const runtimeSummaries = options.runtimeSummary.map((sourcePath) => ({
    sourcePath,
    value: readJson(sourcePath),
  }));
  const runtimeManifests = options.runtimeManifest.map((sourcePath) => ({
    sourcePath,
    value: readJson(sourcePath),
  }));
  const report = buildExperimentResultsReport({ metricsDocuments, runtimeManifests, runtimeSummaries });

  fs.mkdirSync(options.outputDir, { recursive: true });
  const outputs = [
    writeText(options.outputDir, 'results-summary.md', report.markdown),
    writeCsv(options.outputDir, 'score-lanes.csv', report.tables.scoreLanes),
    writeCsv(options.outputDir, 'runtime-summaries.csv', report.tables.runtimeSummaries),
    writeCsv(options.outputDir, 'pareto-candidates.csv', report.tables.paretoCandidates),
    writeCsv(options.outputDir, 'decision-usefulness.csv', report.tables.decisionUsefulness),
    writeCsv(options.outputDir, 'evidence.csv', report.evidence),
    writeText(options.outputDir, 'score-lanes.svg', report.plots.scoreLanes),
    writeText(options.outputDir, 'runtime-latency.svg', report.plots.runtimeLatency),
  ];
  const reportPath = path.join(options.outputDir, 'results-report.json');
  const indexedReport = { ...report, outputs: [...outputs, reportPath] };
  delete indexedReport.markdown;
  delete indexedReport.plots;
  fs.writeFileSync(reportPath, JSON.stringify(indexedReport, null, 2) + '\n', 'utf-8');
  return indexedReport;
};

const ingestMetricsDocuments = (documents) => {
  const seen = new Set();
  const evidence = [];
  const parsed = documents.map(({ sourcePath, value }) => {
    const current = value.runtimeFitness?.current ?? value.runtime_metrics ?? value.metrics?.runtime_metrics;
    const identity = current ? candidateId(current.scenario, current.workload, current.source) : undefined;
    const versions = scoreVersions(value);
    const scoreFields = SCORE_LANES.filter((lane) => value[lane.field] !== undefined).map((lane) => lane.field);
    const hasPareto = value.paretoOptimization !== undefined;
    const hasDecisionUsefulness = value.decisionUsefulness !== undefined;
    const reason = metricsExclusionReason({ current, hasDecisionUsefulness, hasPareto, identity, scoreFields, seen });
    if (!reason && identity) {
      seen.add(identity);
    }
    evidence.push({
      artifactType: 'metrics-json',
      sourcePath,
      scenario: current?.scenario,
      workload: current?.workload,
      source: current?.source,
      fixtureProfile: current?.fixtureProfile,
      scoreLanes: scoreFields.join('|'),
      scoreVersions: versions.join('|'),
      inclusionStatus: reason ? 'excluded' : 'included',
      exclusionReason: reason ?? '',
    });
    return {
      current,
      identity,
      inclusionStatus: reason ? 'excluded' : 'included',
      sourcePath,
      value,
    };
  });
  return { documents: parsed, evidence };
};

const ingestRuntimeSummaries = (summaries, manifestByIdentity) => {
  const seen = new Set();
  const evidence = [];
  const parsed = summaries.map(({ sourcePath, value }) => {
    const identity = candidateId(value.scenario, value.workload, value.source);
    const manifest = manifestByIdentity.get(identity);
    const reason = runtimeExclusionReason({ identity, seen, value });
    if (!reason) {
      seen.add(identity);
    }
    const row = runtimeRow(value, sourcePath, reason, manifest);
    evidence.push({
      artifactType: 'runtime-summary',
      sourcePath,
      scenario: value.scenario,
      workload: value.workload,
      source: value.source,
      fixtureProfile: manifest?.fixtureProfile ?? '',
      manifestPath: manifest?.sourcePath ?? '',
      scoreLanes: '',
      scoreVersions: '',
      inclusionStatus: reason ? 'excluded' : 'included',
      exclusionReason: reason ?? '',
    });
    return {
      identity,
      inclusionStatus: reason ? 'excluded' : 'included',
      row,
      sourcePath,
      value,
    };
  });
  return { summaries: parsed, evidence };
};

const ingestRuntimeManifests = (manifests) => {
  const byIdentity = new Map();
  const successfulIdentityCounts = manifests.reduce((counts, { value }) => {
    const identity = candidateId(value.scenario, value.workload, value.source);
    if (identity && value.collector_summary_written === true) {
      counts.set(identity, (counts.get(identity) ?? 0) + 1);
    }
    return counts;
  }, new Map());
  const evidence = manifests.map(({ sourcePath, value }) => {
    const identity = candidateId(value.scenario, value.workload, value.source);
    const exclusionReason = manifestExclusionReason(value, successfulIdentityCounts.get(identity) ?? 0);
    if (identity && value.collector_summary_written === true && successfulIdentityCounts.get(identity) === 1) {
      byIdentity.set(identity, {
        fixtureProfile: value.fixture_profile?.name ?? '',
        sourcePath,
      });
    }
    return {
      artifactType: 'runtime-manifest',
      sourcePath,
      scenario: value.scenario,
      workload: value.workload,
      source: value.source,
      fixtureProfile: value.fixture_profile?.name ?? '',
      scoreLanes: '',
      scoreVersions: '',
      inclusionStatus: 'excluded',
      exclusionReason,
    };
  });
  return { byIdentity, evidence };
};

const manifestExclusionReason = (value, successfulIdentityCount) => {
  if (value.collector_summary_written === false) {
    return 'manifest-only-failed-or-incomplete-run';
  }
  if (value.collector_summary_written === true && successfulIdentityCount > 1) {
    return 'duplicate-manifest-identity';
  }
  return 'manifest-provenance-not-clean-runtime-evidence';
};

const metricsExclusionReason = ({ current, hasDecisionUsefulness, hasPareto, identity, scoreFields, seen }) => {
  if (!current?.scenario || !current?.workload || !current?.source) {
    return 'missing-scenario-workload-source';
  }
  if (scoreFields.length === 0 && !hasPareto && !hasDecisionUsefulness) {
    return 'missing-score-lanes';
  }
  if (seen.has(identity)) {
    return 'duplicate-candidate-identity';
  }
  return undefined;
};

const runtimeExclusionReason = ({ identity, seen, value }) => {
  if (!value.scenario || !value.workload || !value.source) {
    return 'missing-scenario-workload-source';
  }
  if (!isRecord(value.summary)) {
    return 'missing-summary';
  }
  if (seen.has(identity)) {
    return 'duplicate-candidate-identity';
  }
  return undefined;
};

const buildScoreRows = (documents) => documents.flatMap((document) => SCORE_LANES
  .filter((lane) => document.value[lane.field] !== undefined)
  .map((lane) => ({
    sourcePath: document.sourcePath,
    candidateId: document.identity,
    scenario: document.current.scenario,
    workload: document.current.workload,
    source: document.current.source,
    scoreLane: lane.field,
    scoreLabel: lane.label,
    scoreVersion: lane.versionField ? document.value[lane.versionField] ?? '' : '',
    score: formatValue(document.value[lane.field]),
  })));

const buildParetoRows = (documents) => documents.flatMap((document) => {
  const candidates = document.value.paretoOptimization?.candidates;
  if (!Array.isArray(candidates)) {
    return [];
  }
  return candidates.map((candidate) => ({
    sourcePath: document.sourcePath,
    candidateId: candidate.candidateId ?? '',
    rank: candidate.rank ?? '',
    crowdingDistance: candidate.crowdingDistance ?? '',
    selected: document.value.paretoOptimization?.selectedCandidateIds?.includes(candidate.candidateId) ? 'true' : 'false',
    activeObjectives: (document.value.paretoOptimization?.activeObjectives ?? []).join('|'),
    omittedObjectives: (document.value.paretoOptimization?.omittedObjectives ?? []).join('|'),
  }));
});

const buildDecisionRows = (documents) => documents.flatMap((document) => {
  const decision = document.value.decisionUsefulness;
  if (!isRecord(decision)) {
    return [];
  }
  const candidates = Array.isArray(decision.candidates) ? decision.candidates : [];
  if (candidates.length === 0) {
    return [{
      sourcePath: document.sourcePath,
      candidateId: '',
      usefulnessClassification: decision.usefulnessClassification ?? '',
      fixedScalarTopCandidateId: decision.fixedScalarTopCandidateId ?? '',
      paretoRank: '',
      fixedScalarRank: '',
      betterThanScalarTop: '',
      worseThanScalarTop: '',
      rationale: decision.actionabilitySummary ?? '',
      reasonCodes: (decision.reasonCodes ?? []).join('|'),
      comparatorOmittedObjectives: (decision.comparatorOmittedObjectives ?? []).join('|'),
    }];
  }
  return candidates.map((candidate) => ({
    sourcePath: document.sourcePath,
    candidateId: candidate.candidateId ?? '',
    usefulnessClassification: decision.usefulnessClassification ?? '',
    fixedScalarTopCandidateId: decision.fixedScalarTopCandidateId ?? '',
    paretoRank: candidate.paretoRank ?? '',
    fixedScalarRank: candidate.fixedScalarRank ?? '',
    betterThanScalarTop: (candidate.betterThanScalarTop ?? []).join('|'),
    worseThanScalarTop: (candidate.worseThanScalarTop ?? []).join('|'),
    rationale: candidate.rationale ?? '',
    reasonCodes: (decision.reasonCodes ?? []).join('|'),
    comparatorOmittedObjectives: (decision.comparatorOmittedObjectives ?? []).join('|'),
  }));
});

const buildCanonicalComparison = (runtimeRows) => {
  const workloads = new Set(runtimeRows.map((entry) => entry.value.workload));
  const sources = new Set(runtimeRows.map((entry) => entry.value.source));
  const scenarios = new Set(runtimeRows.map((entry) => entry.value.scenario));
  const missingScenarios = CANONICAL_SCENARIOS.filter((scenario) => !scenarios.has(scenario));
  const valid = workloads.size === 1 && sources.size === 1 && missingScenarios.length === 0;
  return {
    requiredScenarios: [...CANONICAL_SCENARIOS],
    observedScenarios: [...scenarios].sort(),
    workload: workloads.size === 1 ? [...workloads][0] : '',
    source: sources.size === 1 ? [...sources][0] : '',
    status: valid ? 'available' : 'incomplete',
    reasons: [
      ...(workloads.size > 1 ? ['mixed-workloads'] : []),
      ...(sources.size > 1 ? ['mixed-sources'] : []),
      ...missingScenarios.map((scenario) => `missing-${scenario}`),
    ],
  };
};

const buildLimitations = ({ canonicalComparison, decisionRows, evidence, paretoRows, runtime }) => {
  const missingMetrics = new Set();
  runtime.forEach((entry) => {
    const missing = entry.value.missing ?? [];
    missing.forEach((metric) => missingMetrics.add(metric));
    if (!Object.hasOwn(entry.value.summary, 'availability')) {
      missingMetrics.add('availability');
    }
  });
  const excluded = evidence.filter((entry) => entry.inclusionStatus === 'excluded');
  const omittedObjectives = new Set([
    ...paretoRows.flatMap((row) => splitList(row.omittedObjectives)),
    ...decisionRows.flatMap((row) => splitList(row.comparatorOmittedObjectives)),
  ]);
  return {
    canonicalComparisonReasons: canonicalComparison.reasons,
    canonicalComparisonStatus: canonicalComparison.status,
    excludedEvidenceCount: excluded.length,
    excludedEvidenceReasons: uniqueSorted(excluded.map((entry) => entry.exclusionReason).filter(Boolean)),
    missingRuntimeMetrics: uniqueSorted([...missingMetrics]),
    omittedObjectives: uniqueSorted([...omittedObjectives]),
  };
};

const renderMarkdown = ({ decisionRows, evidence, limitations, paretoRows, runtimeRows, scoreRows }) => {
  const excluded = evidence.filter((entry) => entry.inclusionStatus === 'excluded');
  return [
    '# Experiment Results Summary',
    '',
    '## Results',
    '',
    '### Score lanes',
    '',
    renderMarkdownTable(scoreRows, ['candidateId', 'scoreLane', 'scoreVersion', 'score']),
    '',
    '### Runtime summaries',
    '',
    renderMarkdownTable(runtimeRows, ['candidateId', 'latency_p95_ms', 'latency_p99_ms', 'error_rate', 'throughput_rps', 'availability', 'restart_count', 'cpu_utilization', 'memory_utilization', 'missing']),
    '',
    '### Pareto comparison',
    '',
    renderMarkdownTable(paretoRows, ['candidateId', 'rank', 'crowdingDistance', 'selected', 'activeObjectives', 'omittedObjectives']),
    '',
    '### Decision usefulness',
    '',
    renderMarkdownTable(decisionRows, ['candidateId', 'usefulnessClassification', 'fixedScalarTopCandidateId', 'betterThanScalarTop', 'worseThanScalarTop', 'rationale']),
    '',
    '## Discussion',
    '',
    renderDiscussion({ decisionRows, paretoRows, scoreRows }),
    '',
    '## Limitations / Threats to Validity',
    '',
    `- Missing runtime metrics: ${limitations.missingRuntimeMetrics.join(', ') || 'none reported'}.`,
    `- Omitted objectives: ${limitations.omittedObjectives.join(', ') || 'none reported'}.`,
    `- Canonical comparison status: ${limitations.canonicalComparisonStatus}`
      + `${limitations.canonicalComparisonReasons.length > 0
        ? ` (${limitations.canonicalComparisonReasons.join(', ')})`
        : ''}.`,
    `- Excluded evidence artifacts: ${limitations.excludedEvidenceCount}.`,
    ...excluded.map((entry) => `- Excluded ${entry.artifactType} ${entry.sourcePath}: ${entry.exclusionReason}.`),
    '- Availability is reported only when supplied directly; it is not inferred from error rate.',
    '- These outputs are article evidence artifacts, not CI gates or production policy.',
    '',
  ].join('\n');
};

const renderDiscussion = ({ decisionRows, paretoRows, scoreRows }) => {
  const lines = [];
  if (scoreRows.length === 0) {
    lines.push('No included scalar score lanes were supplied.');
  } else {
    lines.push('Scalar score lanes are reported separately so structural, runtime-aware, and adaptive evidence remain comparable without redefining historical fields.');
  }
  if (paretoRows.length === 0) {
    lines.push('No included Pareto candidate rows were supplied.');
  } else {
    lines.push('Pareto rows expose multi-objective candidate metadata for comparison against scalar score lanes.');
  }
  if (decisionRows.length === 0) {
    lines.push('No decision-usefulness rows were supplied.');
  } else {
    lines.push('Decision-usefulness rows state whether Pareto alternatives add actionable trade-offs beyond the fixed scalar comparator.');
  }
  return lines.map((line) => `- ${line}`).join('\n');
};

const renderScoreLanesSvg = (rows) => {
  const values = rows
    .filter((row) => row.score !== '')
    .map((row) => ({ label: `${row.scenario} ${row.scoreLane}`, value: Number(row.score) }))
    .filter((row) => Number.isFinite(row.value));
  return renderBarSvg('Score lanes', values, { min: -1, max: 1 });
};

const renderRuntimeLatencySvg = (rows) => {
  const values = rows
    .map((row) => ({ label: row.scenario, value: Number(row.latency_p95_ms) }))
    .filter((row) => Number.isFinite(row.value));
  return renderBarSvg('Runtime p95 latency (ms)', values, { min: 0 });
};

const renderBarSvg = (title, values, { max, min }) => {
  const width = 720;
  const rowHeight = 32;
  const height = Math.max(120, 70 + values.length * rowHeight);
  const chartMax = max ?? Math.max(1, ...values.map((entry) => entry.value));
  const chartMin = min ?? 0;
  const range = chartMax - chartMin || 1;
  const bars = values.map((entry, index) => {
    const y = 50 + index * rowHeight;
    const value = Math.max(chartMin, Math.min(chartMax, entry.value));
    const barWidth = ((value - chartMin) / range) * 460;
    return [
      `<text x="20" y="${y + 16}" font-size="12">${escapeXml(entry.label)}</text>`,
      `<rect x="220" y="${y}" width="${barWidth.toFixed(2)}" height="20" fill="#2563eb" />`,
      `<text x="${230 + barWidth}" y="${y + 15}" font-size="12">${escapeXml(formatValue(entry.value))}</text>`,
    ].join('\n');
  }).join('\n');
  const empty = values.length === 0
    ? '<text x="20" y="80" font-size="12">No plottable values supplied.</text>'
    : '';
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" role="img" aria-label="${escapeXml(title)}">`,
    '<rect width="100%" height="100%" fill="white" />',
    `<text x="20" y="28" font-size="16" font-weight="700">${escapeXml(title)}</text>`,
    empty,
    bars,
    '</svg>',
    '',
  ].join('\n');
};

const runtimeRow = (value, sourcePath, reason, manifest) => {
  const summary = value.summary ?? {};
  return {
    sourcePath,
    manifestPath: manifest?.sourcePath ?? '',
    candidateId: candidateId(value.scenario, value.workload, value.source) ?? '',
    scenario: value.scenario ?? '',
    workload: value.workload ?? '',
    source: value.source ?? '',
    fixtureProfile: manifest?.fixtureProfile ?? '',
    latency_p95_ms: formatValue(summary.latency_p95_ms),
    latency_p99_ms: formatValue(summary.latency_p99_ms),
    error_rate: formatValue(summary.error_rate),
    throughput_rps: formatValue(summary.throughput_rps),
    availability: formatValue(summary.availability),
    restart_count: formatValue(summary.restart_count),
    cpu_utilization: formatValue(summary.cpu_utilization),
    memory_utilization: formatValue(summary.memory_utilization),
    missing: (value.missing ?? []).join('|'),
    inclusionStatus: reason ? 'excluded' : 'included',
    exclusionReason: reason ?? '',
  };
};

const renderMarkdownTable = (rows, columns) => {
  if (rows.length === 0) {
    return '_No included evidence supplied._';
  }
  return [
    `| ${columns.join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => escapeMarkdown(row[column] ?? '')).join(' | ')} |`),
  ].join('\n');
};

const writeCsv = (outputDir, fileName, rows) => {
  const columns = [...rows.reduce((keys, row) => {
    Object.keys(row).forEach((key) => keys.add(key));
    return keys;
  }, new Set())];
  const content = [
    columns.join(','),
    ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(',')),
  ].join('\n') + '\n';
  return writeText(outputDir, fileName, content);
};

const writeJson = (outputDir, fileName, value) => {
  const outputPath = path.join(outputDir, fileName);
  fs.writeFileSync(outputPath, JSON.stringify(value, null, 2) + '\n', 'utf-8');
  return outputPath;
};

const writeText = (outputDir, fileName, content) => {
  const outputPath = path.join(outputDir, fileName);
  fs.writeFileSync(outputPath, content, 'utf-8');
  return outputPath;
};

const readJson = (sourcePath) => JSON.parse(fs.readFileSync(sourcePath, 'utf-8'));

const readOptionValue = (argv, index, option) => {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${option} requires a value`);
  }
  return value;
};

const candidateId = (scenario, workload, source) => {
  if (!scenario || !workload || !source) {
    return undefined;
  }
  return `${scenario}:${workload}:${source}`;
};

const scoreVersions = (value) => SCORE_LANES
  .map((lane) => (lane.versionField ? value[lane.versionField] : undefined))
  .filter(Boolean);

const splitList = (value) => (value ? String(value).split('|').filter(Boolean) : []);

const uniqueSorted = (values) => [...new Set(values)].sort();

const csvCell = (value) => {
  const text = value === undefined || value === null ? '' : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
};

const escapeMarkdown = (value) => String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');

const escapeXml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const formatValue = (value) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return value === undefined || value === null ? '' : String(value);
  }
  return Number.parseFloat(value.toFixed(6)).toString();
};

const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
