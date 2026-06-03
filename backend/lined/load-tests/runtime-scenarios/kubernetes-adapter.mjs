import { runCommand } from './command-runner.mjs';

export const NAMESPACE = 'lined';
export const BACKEND_DEPLOYMENT = 'lined-backend';
export const BACKEND_LABEL = 'app.kubernetes.io/name=lined-backend';

export const cleanupHpaIfNeeded = (
  options,
  scenario,
  { commandRunner = runCommand, cwd = process.cwd() } = {}
) => {
  if (!scenario.fixedReplicas || options.skipHpaCleanup) {
    return false;
  }

  commandRunner('kubectl', [
    '-n',
    NAMESPACE,
    'delete',
    'hpa',
    BACKEND_DEPLOYMENT,
    '--ignore-not-found',
  ], { cwd });

  return true;
};

export const applyScenarioIfNeeded = (
  options,
  scenario,
  { commandRunner = runCommand, cwd = process.cwd() } = {}
) => {
  if (!options.apply) {
    return false;
  }

  commandRunner('kubectl', ['apply', '-k', scenario.path], { cwd });
  return true;
};

export const waitForRollout = (
  { commandRunner = runCommand, cwd = process.cwd() } = {}
) => {
  commandRunner('kubectl', [
    '-n',
    NAMESPACE,
    'rollout',
    'status',
    `deployment/${BACKEND_DEPLOYMENT}`,
  ], { cwd });
};

export const collectKubernetesState = (
  scenarioName,
  { commandRunner = runCommand, cwd = process.cwd() } = {}
) => {
  const deployment = readKubectlJson(commandRunner, [
    '-n',
    NAMESPACE,
    'get',
    'deployment',
    BACKEND_DEPLOYMENT,
    '-o',
    'json',
  ], cwd);
  const pods = readKubectlJson(commandRunner, [
    '-n',
    NAMESPACE,
    'get',
    'pods',
    '-l',
    BACKEND_LABEL,
    '-o',
    'json',
  ], cwd);
  const hpa = readOptionalKubectlJson(commandRunner, [
    '-n',
    NAMESPACE,
    'get',
    'hpa',
    BACKEND_DEPLOYMENT,
    '-o',
    'json',
  ], cwd);
  const top = readOptionalKubectlText(commandRunner, [
    '-n',
    NAMESPACE,
    'top',
    'pods',
    '-l',
    BACKEND_LABEL,
    '--no-headers',
  ], cwd);

  return {
    ...summarizeKubernetesState({
      deployment,
      hpa,
      pods,
      topOutput: top,
    }),
    scenario: scenarioName,
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
    cpuUtilization: ratioOrUndefined(
      cpuUsage,
      cpuRequest === undefined ? undefined : cpuRequest * podCount
    ),
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

const readKubectlJson = (commandRunner, args, cwd) => JSON.parse(commandRunner(
  'kubectl',
  args,
  {
    capture: true,
    cwd,
  }
).stdout);

const readOptionalKubectlJson = (commandRunner, args, cwd) => {
  const result = commandRunner('kubectl', args, {
    allowFailure: true,
    capture: true,
    cwd,
  });
  const output = String(result.stdout ?? '');
  if (result.error || result.status !== 0 || output.trim() === '') {
    return undefined;
  }
  return JSON.parse(output);
};

const readOptionalKubectlText = (commandRunner, args, cwd) => {
  const result = commandRunner('kubectl', args, {
    allowFailure: true,
    capture: true,
    cwd,
  });
  return result.error || result.status !== 0 ? '' : String(result.stdout ?? '');
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
