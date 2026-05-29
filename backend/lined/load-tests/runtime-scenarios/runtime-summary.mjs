import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const CLI_VERSION = 1;
export const NAMESPACE = 'lined';
export const BACKEND_DEPLOYMENT = 'lined-backend';
export const BACKEND_LABEL = 'app.kubernetes.io/name=lined-backend';
export const SOURCE = 'local-kind';
export const SUMMARY_TREND_STATS = 'p(95),p(99),avg,min,max';

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

const DEFAULT_BASE_URL = 'http://localhost:8080';
const DEFAULT_WORKLOAD = 'baseline';
const DEFAULT_SCRIPT = 'load-tests/k6/load-test-baseline.js';
const DEFAULT_OUTPUT_ROOT = 'load-tests/runtime-scenarios/output';
const K6_ENV_KEYS = new Set([
  'RUN_ID',
  'USER_COUNT',
  'SEED_TASK_COUNT',
  'SEED_EVENT_COUNT',
  'VUS',
  'DURATION',
  'STRESS_MAX_VUS',
  'STRESS_STAGE_DURATION',
  'THINK_TIME_SECONDS',
]);

export const parseArgs = (argv) => {
  const options = {
    allowRemoteBaseUrl: false,
    apply: true,
    baseUrl: DEFAULT_BASE_URL,
    k6Env: {},
    outputRoot: DEFAULT_OUTPUT_ROOT,
    script: DEFAULT_SCRIPT,
    skipHpaCleanup: false,
    workload: DEFAULT_WORKLOAD,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      return { ...options, help: true };
    }
    if (arg === '--scenario') {
      options.scenario = readOptionValue(argv, ++index, arg);
    } else if (arg === '--workload') {
      options.workload = readOptionValue(argv, ++index, arg);
    } else if (arg === '--base-url') {
      options.baseUrl = readOptionValue(argv, ++index, arg);
    } else if (arg === '--output-root') {
      options.outputRoot = readOptionValue(argv, ++index, arg);
    } else if (arg === '--script') {
      options.script = readOptionValue(argv, ++index, arg);
    } else if (arg === '--k6-env') {
      addK6Env(options.k6Env, readOptionValue(argv, ++index, arg));
    } else if (arg === '--skip-apply') {
      options.apply = false;
    } else if (arg === '--skip-hpa-cleanup') {
      options.skipHpaCleanup = true;
    } else if (arg === '--allow-remote-base-url') {
      options.allowRemoteBaseUrl = true;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  validateOptions(options);
  return options;
};

export class RuntimeScenarioRunError extends Error {
  constructor(message, result) {
    super(message);
    this.name = 'RuntimeScenarioRunError';
    this.result = result;
  }
}

export const printHelp = () => `Usage:
  node load-tests/runtime-scenarios/runtime-summary-cli.mjs --scenario <name> [options]

Options:
  --scenario <name>             ${Object.keys(SCENARIOS).join(', ')}
  --workload <name>             ${WORKLOADS.join(', ')} (default: ${DEFAULT_WORKLOAD})
  --base-url <url>              Backend URL (default: ${DEFAULT_BASE_URL})
  --output-root <dir>           Output root (default: ${DEFAULT_OUTPUT_ROOT})
  --script <path>               k6 script path (default: ${DEFAULT_SCRIPT})
  --k6-env KEY=value            Extra k6 env; repeatable for ${Array.from(K6_ENV_KEYS).join(', ')}
  --skip-apply                  Do not apply the selected kustomize scenario
  --skip-hpa-cleanup            Do not delete HPA before fixed-replica scenarios
  --allow-remote-base-url       Allow non-local BASE_URL and pass ALLOW_REMOTE_BASE_URL=true to k6
`;

export const runRuntimeScenario = (options, cwd = process.cwd()) => {
  const scenario = SCENARIOS[options.scenario];
  const startedAt = new Date().toISOString();
  const outputDir = outputDirectory(options, startedAt, cwd);
  fs.mkdirSync(outputDir, { recursive: true });

  const hpaCleanup = cleanupHpaIfNeeded(options, scenario, cwd);
  applyScenarioIfNeeded(options, scenario, cwd);
  waitForRollout(cwd);

  const k6Result = runK6(options, outputDir, cwd);
  const kubernetes = collectKubernetesState(options.scenario, cwd);
  const finishedAt = new Date().toISOString();
  const manifest = buildManifest({
    cwd,
    finishedAt,
    hpaCleanup,
    k6ExitCode: k6Result.exitCode,
    kubernetes,
    options,
    scenario,
    startedAt,
    summaryExported: k6Result.summary !== undefined,
    summaryWritten: k6Result.exitCode === 0,
  });

  const manifestPath = path.join(outputDir, 'runtime-summary-manifest.json');
  writeJson(manifestPath, manifest);

  if (k6Result.exitCode !== 0) {
    throw new RuntimeScenarioRunError(
        `k6 failed with exit code ${k6Result.exitCode}; `
        + `wrote manifest ${manifestPath} but did not write collector summary`,
        {
          manifest,
          manifestPath,
        }
    );
  }

  if (k6Result.summary === undefined) {
    throw new Error('k6 completed without a summary export; collector summary was not written');
  }

  const runtimeSummary = buildRuntimeSummary({
    k6Summary: k6Result.summary,
    kubernetes,
    scenario: options.scenario,
    workload: options.workload,
  });
  const summaryPath = path.join(outputDir, 'runtime-summary.json');
  writeJson(summaryPath, runtimeSummary);

  return {
    manifest,
    manifestPath,
    summary: runtimeSummary,
    summaryPath,
  };
};

export const buildRuntimeSummary = ({ k6Summary, kubernetes, scenario, workload }) => {
  const missing = new Set(['availability']);
  const summary = {
    latency_p95_ms: requiredMetric(k6Summary, 'http_req_duration', 'p(95)'),
    latency_p99_ms: requiredMetric(k6Summary, 'http_req_duration', 'p(99)'),
    error_rate: requiredMetric(k6Summary, 'http_req_failed', 'rate'),
    throughput_rps: requiredMetric(k6Summary, 'http_reqs', 'rate'),
    restart_count: kubernetes.restartCount,
  };

  if (kubernetes.cpuUtilization === undefined) {
    missing.add('cpu_utilization');
  } else {
    summary.cpu_utilization = kubernetes.cpuUtilization;
  }

  if (kubernetes.memoryUtilization === undefined) {
    missing.add('memory_utilization');
  } else {
    summary.memory_utilization = kubernetes.memoryUtilization;
  }

  if (kubernetes.hpa) {
    summary.hpa_current_replicas = kubernetes.hpa.currentReplicas;
    summary.hpa_desired_replicas = kubernetes.hpa.desiredReplicas;
  } else if (scenario === 'hpa-cpu') {
    missing.add('hpa_current_replicas');
    missing.add('hpa_desired_replicas');
  }

  return {
    schema_version: 1,
    scenario,
    workload,
    source: SOURCE,
    summary,
    missing: Array.from(missing).sort(),
  };
};

export const summarizeKubernetesState = ({ deployment, hpa, pods, topOutput }) => {
  const backendContainer = findBackendContainer(deployment);
  const cpuRequest = parseCpuQuantity(backendContainer?.resources?.requests?.cpu);
  const memoryLimit = parseMemoryQuantity(backendContainer?.resources?.limits?.memory);
  const backendPods = Array.isArray(pods?.items) ? pods.items : [];
  const podCount = Math.max(backendPods.length, 1);
  const usage = parseTopPods(topOutput);

  const cpuUsage = sumPodUsage(usage, 'cpuMillicores');
  const memoryUsage = sumPodUsage(usage, 'memoryBytes');

  return {
    cpuUtilization: ratioOrUndefined(cpuUsage, cpuRequest === undefined ? undefined : cpuRequest * podCount),
    hpa: summarizeHpa(hpa),
    memoryUtilization: ratioOrUndefined(
      memoryUsage,
      memoryLimit === undefined ? undefined : memoryLimit * podCount
    ),
    metricsServerAvailable: usage.length > 0,
    replicas: deployment?.status?.replicas,
    restartCount: sumRestartCount(backendPods),
  };
};

export const parseK6Summary = (content) => {
  const parsed = JSON.parse(content);
  if (!isRecord(parsed) || !isRecord(parsed.metrics)) {
    throw new Error('k6 summary export must contain metrics');
  }
  return parsed;
};

export const parseCpuQuantity = (value) => {
  if (value === undefined) {
    return undefined;
  }
  const raw = String(value).trim();
  if (/^\d+(\.\d+)?m$/.test(raw)) {
    return Number.parseFloat(raw.slice(0, -1));
  }
  if (/^\d+(\.\d+)?$/.test(raw)) {
    return Number.parseFloat(raw) * 1000;
  }
  if (/^\d+(\.\d+)?u$/.test(raw)) {
    return Number.parseFloat(raw.slice(0, -1)) / 1000;
  }
  if (/^\d+(\.\d+)?n$/.test(raw)) {
    return Number.parseFloat(raw.slice(0, -1)) / 1000000;
  }
  throw new Error(`Unsupported CPU quantity: ${value}`);
};

export const parseMemoryQuantity = (value) => {
  if (value === undefined) {
    return undefined;
  }
  const raw = String(value).trim();
  const match = /^(\d+(?:\.\d+)?)([A-Za-z]+)?$/.exec(raw);
  if (!match) {
    throw new Error(`Unsupported memory quantity: ${value}`);
  }

  const amount = Number.parseFloat(match[1]);
  const suffix = match[2] ?? '';
  const multipliers = {
    '': 1,
    K: 1000,
    Ki: 1024,
    M: 1000 ** 2,
    Mi: 1024 ** 2,
    G: 1000 ** 3,
    Gi: 1024 ** 3,
    T: 1000 ** 4,
    Ti: 1024 ** 4,
  };
  const multiplier = multipliers[suffix];
  if (multiplier === undefined) {
    throw new Error(`Unsupported memory quantity: ${value}`);
  }

  return amount * multiplier;
};

export const parseTopPods = (content = '') => content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, cpu, memory] = line.split(/\s+/);
      return {
        cpuMillicores: parseCpuQuantity(cpu),
        memoryBytes: parseMemoryQuantity(memory),
        name,
      };
    });

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

const readOptionValue = (argv, index, option) => {
  const value = argv[index];
  if (value === undefined || value.startsWith('--')) {
    throw new Error(`${option} requires a value`);
  }
  return value;
};

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
  if (!options.scenario || SCENARIOS[options.scenario] === undefined) {
    throw new Error(`--scenario must be one of: ${Object.keys(SCENARIOS).join(', ')}`);
  }
  if (!WORKLOADS.includes(options.workload)) {
    throw new Error(`--workload must be one of: ${WORKLOADS.join(', ')}`);
  }
  ensureLocalBaseUrl(options.baseUrl, options.allowRemoteBaseUrl);
};

const cleanupHpaIfNeeded = (options, scenario, cwd) => {
  if (!scenario.fixedReplicas || options.skipHpaCleanup) {
    return false;
  }
  runCommand('kubectl', [
    '-n',
    NAMESPACE,
    'delete',
    'hpa',
    BACKEND_DEPLOYMENT,
    '--ignore-not-found',
  ], { cwd });
  return true;
};

const applyScenarioIfNeeded = (options, scenario, cwd) => {
  if (!options.apply) {
    return;
  }
  runCommand('kubectl', ['apply', '-k', scenario.path], { cwd });
};

const waitForRollout = (cwd) => {
  runCommand('kubectl', [
    '-n',
    NAMESPACE,
    'rollout',
    'status',
    `deployment/${BACKEND_DEPLOYMENT}`,
  ], { cwd });
};

const runK6 = (options, outputDir, cwd) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lined-k6-summary-'));
  const summaryPath = path.join(tempDir, 'summary.json');
  const args = [
    'run',
    '--summary-export',
    summaryPath,
    '--summary-trend-stats',
    SUMMARY_TREND_STATS,
    '-e',
    `WORKLOAD=${options.workload}`,
    '-e',
    `BASE_URL=${options.baseUrl}`,
  ];

  for (const [key, value] of Object.entries(options.k6Env)) {
    args.push('-e', `${key}=${value}`);
  }
  if (options.allowRemoteBaseUrl) {
    args.push('-e', 'ALLOW_REMOTE_BASE_URL=true');
  }
  args.push(options.script);

  const result = spawnSync('k6', args, { cwd, stdio: 'inherit' });
  if (result.error) {
    throw result.error;
  }

  try {
    return {
      exitCode: result.status,
      summary: fs.existsSync(summaryPath)
        ? parseK6Summary(fs.readFileSync(summaryPath, 'utf-8'))
        : undefined,
    };
  } finally {
    fs.rmSync(tempDir, { force: true, recursive: true });
  }
};

const collectKubernetesState = (scenario, cwd) => {
  const deployment = readKubectlJson([
    '-n',
    NAMESPACE,
    'get',
    'deployment',
    BACKEND_DEPLOYMENT,
    '-o',
    'json',
  ], cwd);
  const pods = readKubectlJson([
    '-n',
    NAMESPACE,
    'get',
    'pods',
    '-l',
    BACKEND_LABEL,
    '-o',
    'json',
  ], cwd);
  const hpa = readOptionalKubectlJson([
    '-n',
    NAMESPACE,
    'get',
    'hpa',
    BACKEND_DEPLOYMENT,
    '-o',
    'json',
  ], cwd);
  const top = readOptionalKubectlText([
    '-n',
    NAMESPACE,
    'top',
    'pods',
    '-l',
    BACKEND_LABEL,
    '--no-headers',
  ], cwd);
  const state = summarizeKubernetesState({
    deployment,
    hpa,
    pods,
    topOutput: top,
  });

  return {
    ...state,
    scenario,
  };
};

const readKubectlJson = (args, cwd) => JSON.parse(runCommand('kubectl', args, {
  capture: true,
  cwd,
}).stdout);

const readOptionalKubectlJson = (args, cwd) => {
  const result = runCommand('kubectl', args, {
    allowFailure: true,
    capture: true,
    cwd,
  });
  if (result.status !== 0 || result.stdout.trim() === '') {
    return undefined;
  }
  return JSON.parse(result.stdout);
};

const readOptionalKubectlText = (args, cwd) => {
  const result = runCommand('kubectl', args, {
    allowFailure: true,
    capture: true,
    cwd,
  });
  return result.status === 0 ? result.stdout : '';
};

const runCommand = (command, args, { allowFailure = false, capture = false, cwd } = {}) => {
  const result = spawnSync(command, args, {
    cwd,
    encoding: capture ? 'utf-8' : undefined,
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });
  if (result.error) {
    throw result.error;
  }
  if (!allowFailure && result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
  }
  return result;
};

const outputDirectory = (options, startedAt, cwd) => {
  const safeTimestamp = startedAt.replaceAll(/[:.]/g, '-');
  const outputName = `${options.scenario}-${options.workload}-${safeTimestamp}`;
  return path.resolve(cwd, options.outputRoot, outputName);
};

export const buildManifest = ({
  cwd,
  finishedAt,
  hpaCleanup,
  k6ExitCode,
  kubernetes,
  options,
  scenario,
  startedAt,
  summaryExported,
  summaryWritten,
}) => ({
  schema_version: 1,
  artifact: 'runtime-scenario-summary',
  cli_version: CLI_VERSION,
  source: SOURCE,
  scenario: options.scenario,
  scenario_path: scenario.path,
  workload: options.workload,
  workload_env: {
    BASE_URL: options.baseUrl,
    WORKLOAD: options.workload,
    ...options.k6Env,
  },
  started_at: startedAt,
  finished_at: finishedAt,
  git: {
    branch: readOptionalGit(['branch', '--show-current'], cwd),
    commit: readOptionalGit(['rev-parse', 'HEAD'], cwd),
  },
  k6: {
    exit_code: k6ExitCode,
    script: options.script,
    summary_exported: summaryExported,
    summary_trend_stats: SUMMARY_TREND_STATS,
  },
  collector_summary_written: summaryWritten,
  kubernetes: {
    deployment: BACKEND_DEPLOYMENT,
    hpa_cleanup: hpaCleanup,
    metrics_server_available: kubernetes.metricsServerAvailable,
    namespace: NAMESPACE,
    replicas: kubernetes.replicas,
  },
});

const readOptionalGit = (args, cwd) => {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  return result.status === 0 ? result.stdout.trim() : undefined;
};

const writeJson = (file, value) => {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf-8');
};

const requiredMetric = (k6Summary, metric, valueName) => {
  const value = k6Summary.metrics?.[metric]?.values?.[valueName];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`k6 summary missing numeric ${metric}.values["${valueName}"]`);
  }
  return value;
};

const findBackendContainer = (deployment) => {
  const containers = deployment?.spec?.template?.spec?.containers;
  if (!Array.isArray(containers)) {
    return undefined;
  }
  return containers.find((container) => container.name === 'backend') ?? containers[0];
};

const summarizeHpa = (hpa) => {
  if (!hpa) {
    return undefined;
  }
  const currentReplicas = hpa.status?.currentReplicas;
  const desiredReplicas = hpa.status?.desiredReplicas;
  if (typeof currentReplicas !== 'number' || typeof desiredReplicas !== 'number') {
    return undefined;
  }
  return {
    currentReplicas,
    desiredReplicas,
  };
};

const sumRestartCount = (pods) => pods
    .flatMap((pod) => Array.isArray(pod.status?.containerStatuses)
      ? pod.status.containerStatuses
      : [])
    .filter((status) => status.name === 'backend' || pods.length === 1)
    .reduce((total, status) => total + (status.restartCount ?? 0), 0);

const sumPodUsage = (usage, field) => {
  if (usage.length === 0) {
    return undefined;
  }
  return usage.reduce((total, pod) => total + pod[field], 0);
};

const ratioOrUndefined = (numerator, denominator) => {
  if (numerator === undefined || denominator === undefined || denominator <= 0) {
    return undefined;
  }
  return Number((numerator / denominator).toFixed(6));
};

const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
