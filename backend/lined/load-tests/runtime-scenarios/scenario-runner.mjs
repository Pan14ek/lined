import fs from 'node:fs';
import path from 'node:path';

import {
  applyScenarioIfNeeded,
  cleanupHpaIfNeeded,
  collectKubernetesState,
  waitForRollout,
} from './kubernetes-adapter.mjs';
import { assertK6Available, runK6, SUMMARY_TREND_STATS } from './k6-adapter.mjs';
import {
  buildManifest,
  buildRuntimeSummary,
  buildWindowKubernetesState,
} from './runtime-summary.mjs';
import { runCommand } from './command-runner.mjs';
import {
  FIXTURE_PROFILES_PATH,
  K6_ENV_KEYS,
  applyFixtureProfileDefaults,
  fixtureProfileNames,
} from './fixture-profiles.mjs';
import { matchRuntimeQualityScenarios } from './runtime-quality-catalog.mjs';

export const SCENARIOS = Object.freeze({
  'fixed-small': {
    fixedReplicas: true,
    path: 'k8s/kind/scenarios/fixed-small',
  },
  'fixed-medium': {
    fixedReplicas: true,
    path: 'k8s/kind/scenarios/fixed-medium',
  },
  'replicas-2': {
    fixedReplicas: true,
    path: 'k8s/kind/scenarios/replicas-2',
  },
  'hpa-cpu': {
    fixedReplicas: false,
    path: 'k8s/kind/scenarios/hpa-cpu',
  },
});

export const WORKLOADS = Object.freeze([
  'smoke',
  'baseline',
  'read-heavy',
  'write-heavy',
  'mixed',
  'stress',
  'negative-smoke',
]);
export const SCENARIO_SETS = Object.freeze({
  'all-supported': Object.freeze(Object.keys(SCENARIOS)),
});

const DEFAULT_BASE_URL = 'http://localhost:8080';
const DEFAULT_K6_BIN = 'k6';
const DEFAULT_OUTPUT_ROOT = 'load-tests/runtime-scenarios/output';
const DEFAULT_SCRIPT = 'load-tests/k6/load-test-baseline.js';
const DEFAULT_WORKLOAD = 'baseline';
const DEFAULT_SCENARIO_SET = 'all-supported';
const HELP_OPTIONS = new Set(['--help', '-h']);

const OPTION_HANDLERS = Object.freeze({
  '--scenario': readOptionInto('scenario'),
  '--scenario-set': readOptionInto('scenarioSet'),
  '--workload': (state, option) => {
    state.options.workload = readNextOptionValue(state, option);
    state.workloadExplicit = true;
  },
  '--base-url': readOptionInto('baseUrl'),
  '--fixture-profile': readOptionInto('fixtureProfile'),
  '--fixture-profile-file': readOptionInto('fixtureProfileFile'),
  '--output-root': readOptionInto('outputRoot'),
  '--script': readOptionInto('script'),
  '--k6-bin': readOptionInto('k6Bin'),
  '--k6-env': (state, option) => addK6Env(
    state.explicitK6Env,
    readNextOptionValue(state, option)
  ),
  '--skip-apply': (state) => {
    state.options.apply = false;
  },
  '--skip-hpa-cleanup': (state) => {
    state.options.skipHpaCleanup = true;
  },
  '--allow-remote-base-url': (state) => {
    state.options.allowRemoteBaseUrl = true;
  },
});

export class ScenarioRunError extends Error {
  constructor(message, result) {
    super(message);
    this.name = 'ScenarioRunError';
    this.result = result;
  }
}

export class ScenarioSetRunError extends Error {
  constructor(message, result) {
    super(message);
    this.name = 'ScenarioSetRunError';
    this.result = result;
  }
}

export const defaultOptions = () => ({
  allowRemoteBaseUrl: false,
  apply: true,
  baseUrl: DEFAULT_BASE_URL,
  fixtureProfile: undefined,
  fixtureProfileFile: FIXTURE_PROFILES_PATH,
  k6Bin: DEFAULT_K6_BIN,
  k6Env: {},
  outputRoot: DEFAULT_OUTPUT_ROOT,
  script: DEFAULT_SCRIPT,
  skipHpaCleanup: false,
  workload: DEFAULT_WORKLOAD,
});

export const parseArgs = (argv) => {
  const state = {
    argv,
    explicitK6Env: {},
    index: 0,
    options: defaultOptions(),
    workloadExplicit: false,
  };

  for (; state.index < argv.length; state.index += 1) {
    const arg = argv[state.index];
    if (HELP_OPTIONS.has(arg)) {
      return { ...state.options, help: true };
    }
    const handler = OPTION_HANDLERS[arg];
    if (!handler) {
      throw new Error(`Unknown option: ${arg}`);
    }
    handler(state, arg);
  }

  state.options.k6Env = { ...state.explicitK6Env };
  const resolvedOptions = applyFixtureProfileDefaults(state.options, {
    allowedWorkloads: new Set(WORKLOADS),
    explicitK6Env: state.explicitK6Env,
    fixtureFile: state.options.fixtureProfileFile,
    workloadExplicit: state.workloadExplicit,
  });
  if (resolvedOptions.scenarioSet) {
    validateSetOptions(resolvedOptions);
  } else {
    validateOptions(resolvedOptions);
  }
  return resolvedOptions;
};

export const printHelp = () => `Usage:
  node load-tests/runtime-scenarios/scenario-runner-cli.mjs --scenario <name> [options]
  node load-tests/runtime-scenarios/scenario-runner-cli.mjs --scenario-set <name> [options]

Options:
  --scenario <name>             ${Object.keys(SCENARIOS).join(', ')}
  --scenario-set <name>         ${Object.keys(SCENARIO_SETS).join(', ')} (default batch set: ${DEFAULT_SCENARIO_SET})
  --workload <name>             ${WORKLOADS.join(', ')} (default: ${DEFAULT_WORKLOAD})
  --fixture-profile <name>      ${fixtureProfileNames().join(', ')}
  --fixture-profile-file <path> Fixture profile artifact (default: ${FIXTURE_PROFILES_PATH})
  --base-url <url>              Backend URL (default: ${DEFAULT_BASE_URL})
  --output-root <dir>           Output root (default: ${DEFAULT_OUTPUT_ROOT})
  --script <path>               k6 script path (default: ${DEFAULT_SCRIPT})
  --k6-bin <path>               k6 executable (default: ${DEFAULT_K6_BIN})
  --k6-env KEY=value            Extra k6 env; repeatable for ${Array.from(K6_ENV_KEYS).join(', ')}
  --skip-apply                  Do not apply the selected kustomize scenario
  --skip-hpa-cleanup            Do not delete HPA before fixed-replica scenarios
  --allow-remote-base-url       Allow non-local BASE_URL and pass ALLOW_REMOTE_BASE_URL=true to k6
`;

export const runScenario = (
  options,
  {
    clock = () => new Date().toISOString(),
    commandRunner = runCommand,
    cwd = process.cwd(),
    kubernetesAdapter = defaultKubernetesAdapter(commandRunner, cwd),
    k6Adapter = defaultK6Adapter(commandRunner, cwd),
    gitReader = defaultGitReader(commandRunner, cwd),
  } = {}
) => {
  const runOptions = resolveFixtureOptions(options);
  validateOptions(runOptions);
  const scenario = SCENARIOS[runOptions.scenario];
  k6Adapter.assertAvailable(runOptions.k6Bin);

  const startedAt = clock();
  const outputDir = outputDirectory(runOptions, startedAt, cwd);
  const hpaCleanup = kubernetesAdapter.cleanupHpaIfNeeded(runOptions, scenario);
  const appliedScenario = kubernetesAdapter.applyScenarioIfNeeded(runOptions, scenario);
  kubernetesAdapter.waitForRollout();

  const beforeWorkload = kubernetesAdapter.collectState(runOptions.scenario);
  const k6Result = k6Adapter.run(runOptions);
  const afterWorkload = kubernetesAdapter.collectState(runOptions.scenario);
  const kubernetes = buildWindowKubernetesState(beforeWorkload, afterWorkload);
  const finishedAt = clock();
  const manifestPath = path.join(outputDir, 'runtime-summary-manifest.json');
  fs.mkdirSync(outputDir, { recursive: true });
  const manifestBase = {
    appliedScenario,
    finishedAt,
    git: gitReader(),
    hpaCleanup,
    k6: {
      exitCode: k6Result.exitCode,
      signal: k6Result.signal,
      summaryTrendStats: SUMMARY_TREND_STATS,
    },
    kubernetes,
    options: runOptions,
    scenario,
    startedAt,
    summaryExported: k6Result.summary !== undefined,
  };

  if (k6Result.signal) {
    const manifest = buildManifest({
      ...manifestBase,
      summaryFailure: `k6 was killed by signal ${k6Result.signal}`,
      summaryWritten: false,
    });
    writeJson(manifestPath, manifest);
    throw new ScenarioRunError(
      `k6 was killed by signal ${k6Result.signal}; `
      + `wrote manifest ${manifestPath} but did not write collector summary`,
      {
        manifest,
        manifestPath,
      }
    );
  }

  if (k6Result.exitCode !== 0) {
    const manifest = buildManifest({
      ...manifestBase,
      summaryFailure: `k6 exited with ${k6Result.exitCode}`,
      summaryWritten: false,
    });
    writeJson(manifestPath, manifest);
    throw new ScenarioRunError(
      `k6 failed with exit code ${k6Result.exitCode}; `
      + `wrote manifest ${manifestPath} but did not write collector summary`,
      {
        manifest,
        manifestPath,
      }
    );
  }

  if (k6Result.summary === undefined) {
    const manifest = buildManifest({
      ...manifestBase,
      summaryFailure: 'k6 completed without a summary export',
      summaryWritten: false,
    });
    writeJson(manifestPath, manifest);
    throw new ScenarioRunError(
      'k6 completed without a summary export; collector summary was not written',
      {
        manifest,
        manifestPath,
      }
    );
  }

  const summaryPath = path.join(outputDir, 'runtime-summary.json');
  let summary;
  try {
    summary = buildRuntimeSummary({
      k6Summary: k6Result.summary,
      kubernetes,
      scenario: runOptions.scenario,
      workload: runOptions.workload,
    });
    writeJson(summaryPath, summary);
  } catch (error) {
    const summaryFailure = error instanceof Error ? error.message : String(error);
    const manifest = buildManifest({
      ...manifestBase,
      summaryFailure,
      summaryWritten: false,
    });
    writeJson(manifestPath, manifest);
    throw new ScenarioRunError(summaryFailure, {
      manifest,
      manifestPath,
    });
  }

  const manifest = buildManifest({
    ...manifestBase,
    runtimeSummary: summary,
    summaryWritten: true,
  });
  writeJson(manifestPath, manifest);

  return {
    manifest,
    manifestPath,
    summary,
    summaryPath,
  };
};

export const runScenarioSet = (
  options,
  {
    clock = () => new Date().toISOString(),
    cwd = process.cwd(),
    scenarioRunner = runScenario,
  } = {}
) => {
  const runOptions = resolveFixtureOptions(options);
  validateSetOptions(runOptions);
  const startedAt = clock();
  const scenarios = resolveScenarioSet(runOptions.scenarioSet);
  const setRoot = outputSetRoot(runOptions, startedAt, cwd);
  fs.mkdirSync(setRoot, { recursive: true });

  const entries = scenarios.map((scenarioName) => runScenarioSetEntry(
    scenarioName,
    runOptions,
    { clock, cwd, scenarioRunner, setRoot }
  ));
  const finishedAt = clock();
  const index = buildScenarioSetIndex({
    cwd,
    entries,
    finishedAt,
    options: runOptions,
    setRoot,
    startedAt,
  });
  const indexPath = path.join(setRoot, 'runtime-summary-set-index.json');
  writeJson(indexPath, index);

  const result = {
    failed: index.failed_scenarios.length > 0,
    index,
    indexPath,
    setRoot,
  };
  if (result.failed) {
    throw new ScenarioSetRunError(
      `scenario set ${runOptions.scenarioSet} completed with `
      + `${index.failed_scenarios.length} incomplete scenario(s); `
      + `wrote set index ${indexPath}`,
      result
    );
  }
  return result;
};

const resolveFixtureOptions = (options) => {
  if (!options.fixtureProfile || options.fixtureProfileData) {
    return options;
  }
  return applyFixtureProfileDefaults(
    {
      ...options,
      fixtureProfileFile: options.fixtureProfileFile ?? FIXTURE_PROFILES_PATH,
      k6Env: options.k6Env ?? {},
    },
    {
      allowedWorkloads: new Set(WORKLOADS),
      explicitK6Env: options.k6Env ?? {},
      fixtureFile: options.fixtureProfileFile ?? FIXTURE_PROFILES_PATH,
      workloadExplicit: isProgrammaticWorkloadExplicit(options),
    }
  );
};

const isProgrammaticWorkloadExplicit = (options) => options.workloadExplicit === true
  || (options.workload !== undefined && options.workload !== DEFAULT_WORKLOAD);

export const ensureLocalBaseUrl = (baseUrl, allowRemoteBaseUrl) => {
  if (allowRemoteBaseUrl) {
    return;
  }
  const local = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::|\/|$)/.test(baseUrl);
  if (!local) {
    throw new Error(
      'BASE_URL must point to localhost, 127.0.0.1, or [::1]. '
      + 'Use --allow-remote-base-url only for an intentional controlled target.'
    );
  }
};

const defaultKubernetesAdapter = (commandRunner, cwd) => ({
  applyScenarioIfNeeded: (options, scenario) => applyScenarioIfNeeded(
    options,
    scenario,
    { commandRunner, cwd }
  ),
  cleanupHpaIfNeeded: (options, scenario) => cleanupHpaIfNeeded(
    options,
    scenario,
    { commandRunner, cwd }
  ),
  collectState: (scenarioName) => collectKubernetesState(
    scenarioName,
    { commandRunner, cwd }
  ),
  waitForRollout: () => waitForRollout({ commandRunner, cwd }),
});

const defaultK6Adapter = (commandRunner, cwd) => ({
  assertAvailable: (k6Bin) => assertK6Available(k6Bin, { commandRunner, cwd }),
  run: (options) => runK6(options, { commandRunner, cwd }),
});

const defaultGitReader = (commandRunner, cwd) => () => ({
  branch: readOptionalGit(commandRunner, ['branch', '--show-current'], cwd),
  commit: readOptionalGit(commandRunner, ['rev-parse', 'HEAD'], cwd),
});

const readOptionValue = (argv, index, option) => {
  const value = argv[index];
  if (value === undefined || value.startsWith('--')) {
    throw new Error(`${option} requires a value`);
  }
  return value;
};

function readOptionInto(property) {
  return (state, option) => {
    state.options[property] = readNextOptionValue(state, option);
  };
}

function readNextOptionValue(state, option) {
  state.index += 1;
  return readOptionValue(state.argv, state.index, option);
}

const addK6Env = (k6Env, assignment) => {
  const separator = assignment.indexOf('=');
  if (separator < 1) {
    throw new Error('--k6-env requires KEY=value');
  }
  const key = assignment.slice(0, separator);
  const value = assignment.slice(separator + 1);
  if (!K6_ENV_KEYS.has(key)) {
    throw new Error(`Unsupported k6 env ${key}; allowed: ${Array.from(K6_ENV_KEYS).join(', ')}`);
  }
  k6Env[key] = value;
};

const validateOptions = (options) => {
  if (options.scenarioSet) {
    throw new Error('--scenario-set is only supported by runScenarioSet');
  }
  if (!options.scenario || SCENARIOS[options.scenario] === undefined) {
    throw new Error(`--scenario must be one of: ${Object.keys(SCENARIOS).join(', ')}`);
  }
  if (!WORKLOADS.includes(options.workload)) {
    throw new Error(`--workload must be one of: ${WORKLOADS.join(', ')}`);
  }
  ensureLocalBaseUrl(options.baseUrl, options.allowRemoteBaseUrl);
};

const outputDirectory = (options, startedAt, cwd) => {
  const safeTimestamp = startedAt.replaceAll(/[:.]/g, '-');
  const outputName = `${options.scenario}-${options.workload}-${safeTimestamp}`;
  return path.resolve(cwd, options.outputRoot, outputName);
};

const validateSetOptions = (options) => {
  if (options.scenario) {
    throw new Error('Use either --scenario or --scenario-set, not both');
  }
  if (!options.scenarioSet) {
    throw new Error(`--scenario-set must be one of: ${Object.keys(SCENARIO_SETS).join(', ')}`);
  }
  resolveScenarioSet(options.scenarioSet);
  if (!WORKLOADS.includes(options.workload)) {
    throw new Error(`--workload must be one of: ${WORKLOADS.join(', ')}`);
  }
  ensureLocalBaseUrl(options.baseUrl, options.allowRemoteBaseUrl);
};

const resolveScenarioSet = (scenarioSet) => {
  const scenarios = SCENARIO_SETS[scenarioSet];
  if (!scenarios) {
    throw new Error(`--scenario-set must be one of: ${Object.keys(SCENARIO_SETS).join(', ')}`);
  }
  return scenarios;
};

const outputSetRoot = (options, startedAt, cwd) => {
  const safeTimestamp = startedAt.replaceAll(/[:.]/g, '-');
  const label = options.fixtureProfileData
    ? `${options.fixtureProfileData.name}-${options.workload}`
    : options.workload;
  return path.resolve(cwd, options.outputRoot, 'sets', `${label}-${safeTimestamp}`);
};

const runScenarioSetEntry = (
  scenarioName,
  options,
  { clock, cwd, scenarioRunner, setRoot }
) => {
  const scenarioOptions = {
    ...options,
    outputRoot: setRoot,
    scenario: scenarioName,
    scenarioSet: undefined,
  };

  try {
    const result = scenarioRunner(scenarioOptions, { clock, cwd });
    return buildScenarioSetEntry({
      manifestPath: result.manifestPath,
      options,
      repoCwd: cwd,
      scenarioName,
      setRoot,
      status: 'collector-ready',
      summaryPath: result.summaryPath,
    });
  } catch (error) {
    if (error instanceof ScenarioRunError) {
      return buildScenarioSetEntry({
        error,
        manifestPath: error.result?.manifestPath,
        options,
        repoCwd: cwd,
        scenarioName,
        setRoot,
        status: 'incomplete',
        summaryPath: undefined,
      });
    }
    return buildScenarioSetEntry({
      error,
      manifestPath: undefined,
      options,
      repoCwd: cwd,
      scenarioName,
      setRoot,
      status: 'failed-before-manifest',
      summaryPath: undefined,
    });
  }
};

const buildScenarioSetEntry = ({
  error,
  manifestPath,
  options,
  repoCwd,
  scenarioName,
  setRoot,
  status,
  summaryPath,
}) => {
  const relativeManifestPath = toRelativePath(manifestPath, repoCwd);
  const relativeSummaryPath = toRelativePath(summaryPath, repoCwd);
  return {
    error: error instanceof Error ? error.message : undefined,
    manifest_path: relativeManifestPath,
    quality_scenarios: matchRuntimeQualityScenarios(
      {
        scenario: scenarioName,
        workload: options.workload,
      },
      { cwd: repoCwd }
    ),
    scenario: scenarioName,
    status,
    summary_path: relativeSummaryPath,
  };
};

const buildScenarioSetIndex = ({
  cwd,
  entries,
  finishedAt,
  options,
  setRoot,
  startedAt,
}) => ({
  schema_version: 1,
  artifact: 'runtime-scenario-summary-set',
  scenario_set: options.scenarioSet,
  source: 'local-kind',
  fixture_profile: options.fixtureProfileData ? {
    name: options.fixtureProfileData.name,
    schema_version: options.fixtureProfileData.schemaVersion,
    workload: options.fixtureProfileData.workload,
  } : undefined,
  workload: options.workload,
  started_at: startedAt,
  finished_at: finishedAt,
  collector_ready_scenarios: entries
    .filter((entry) => entry.status === 'collector-ready')
    .map((entry) => ({
      manifest_path: entry.manifest_path,
      scenario: entry.scenario,
      summary_path: entry.summary_path,
    })),
  failed_scenarios: entries
    .filter((entry) => entry.status !== 'collector-ready')
    .map((entry) => ({
      error: entry.error,
      manifest_path: entry.manifest_path,
      scenario: entry.scenario,
      status: entry.status,
    })),
  scenarios: entries.map((entry) => ({
    manifest_path: entry.manifest_path,
    quality_scenarios: entry.quality_scenarios,
    scenario: entry.scenario,
    status: entry.status,
    summary_path: entry.summary_path,
  })),
  workload_identity: {
    effective_workload: options.workload,
    fixture_profile_name: options.fixtureProfileData?.name,
    fixture_profile_workload: options.fixtureProfileData?.workload,
  },
  output_root: toRelativePath(setRoot, cwd),
});

const toRelativePath = (targetPath, cwd) => {
  if (!targetPath) {
    return undefined;
  }
  return path.relative(cwd, targetPath) || '.';
};

const readOptionalGit = (commandRunner, args, cwd) => {
  const result = commandRunner('git', args, {
    allowFailure: true,
    capture: true,
    cwd,
  });
  return result.status === 0 ? result.stdout.trim() : undefined;
};

const writeJson = (file, value) => {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf-8');
};
