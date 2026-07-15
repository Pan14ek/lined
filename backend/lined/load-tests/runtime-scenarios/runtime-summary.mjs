import crypto from 'node:crypto';

export const CLI_VERSION = 1;
export const SOURCE = 'local-kind';

export const parseK6Summary = (content) => {
  const parsed = JSON.parse(content);
  if (!isRecord(parsed) || !isRecord(parsed.metrics)) {
    throw new Error('k6 summary export must contain metrics');
  }
  return parsed;
};

export const buildRuntimeSummary = ({ k6Summary, kubernetes, scenario, workload }) => {
  const missing = new Set(['availability']);
  const summary = {
    latency_median_ms: requiredMetric(k6Summary, 'http_req_duration', 'med'),
    latency_p95_ms: requiredMetric(k6Summary, 'http_req_duration', 'p(95)'),
    latency_p99_ms: requiredMetric(k6Summary, 'http_req_duration', 'p(99)'),
    error_rate: requiredMetric(k6Summary, 'http_req_failed', 'rate', ['value']),
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

export const buildWindowKubernetesState = (before, after) => ({
  ...after,
  restartCount: restartDelta(before?.restartCount, after?.restartCount),
  restartCountAfter: after?.restartCount,
  restartCountBefore: before?.restartCount,
});

export const buildManifest = ({
  appliedScenario,
  finishedAt,
  git,
  hpaCleanup,
  k6,
  runtimeSummary,
  summaryExported,
  summaryFailure,
  kubernetes,
  options,
  scenario,
  startedAt,
  summaryWritten,
}) => ({
  schema_version: 1,
  artifact: 'runtime-scenario-summary',
  cli_version: CLI_VERSION,
  source: SOURCE,
  scenario: options.scenario,
  scenario_path: scenario.path,
  workload: options.workload,
  fixture_profile: options.fixtureProfileData ? {
    name: options.fixtureProfileData.name,
    schema_version: options.fixtureProfileData.schemaVersion,
    workload: options.fixtureProfileData.workload,
    k6_env: options.fixtureProfileData.k6Env,
  } : undefined,
  workload_env: {
    BASE_URL: options.baseUrl,
    WORKLOAD: options.workload,
    ...options.k6Env,
  },
  started_at: startedAt,
  finished_at: finishedAt,
  git,
  k6: {
    exit_code: k6.exitCode,
    executable: options.k6Bin,
    script: options.script,
    signal: k6.signal,
    summary_exported: summaryExported,
    summary_trend_stats: k6.summaryTrendStats,
  },
  collector_summary_written: summaryWritten,
  provenance: {
    configuration_hash: buildConfigurationHash({
      fixtureProfile: options.fixtureProfileData,
      kubernetes,
      scenario,
      workloadEnv: {
        WORKLOAD: options.workload,
        ...options.k6Env,
      },
    }),
    evidence_status: summaryWritten ? 'collector-ready' : 'incomplete',
    runtime_evidence_vector: runtimeSummary ? {
      missing: runtimeSummary.missing,
      summary: runtimeSummary.summary,
    } : undefined,
    summary_failure: summaryFailure,
    telemetry_window: {
      finished_at: finishedAt,
      started_at: startedAt,
    },
  },
  kubernetes: {
    applied_scenario: appliedScenario,
    configuration: kubernetes.configuration,
    deployment: 'lined-backend',
    hpa_cleanup: hpaCleanup,
    image: kubernetes.image,
    metrics_server_available: kubernetes.metricsServerAvailable,
    namespace: 'lined',
    replicas: kubernetes.replicas,
    restart_count_after: kubernetes.restartCountAfter,
    restart_count_before: kubernetes.restartCountBefore,
    restart_count_delta: kubernetes.restartCount,
  },
});

const requiredMetric = (k6Summary, metric, valueName, fallbackValueNames = []) => {
  const metricValues = k6Summary.metrics?.[metric];
  const value = readK6MetricValue(metricValues, [valueName, ...fallbackValueNames]);
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`k6 summary missing numeric ${metric}.${valueName}`);
  }
  return value;
};

const readK6MetricValue = (metricValues, valueNames) => {
  if (!metricValues) {
    return undefined;
  }
  for (const valueName of valueNames) {
    const nested = metricValues.values?.[valueName];
    if (nested !== undefined) {
      return nested;
    }
    const flat = metricValues[valueName];
    if (flat !== undefined) {
      return flat;
    }
  }
  return undefined;
};

const restartDelta = (before, after) => {
  if (typeof after !== 'number' || !Number.isFinite(after)) {
    return undefined;
  }
  if (typeof before !== 'number' || !Number.isFinite(before)) {
    return after;
  }
  return Math.max(0, after - before);
};

const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

const buildConfigurationHash = ({ fixtureProfile, kubernetes, scenario, workloadEnv }) => {
  const canonicalInput = {
    fixture_profile: fixtureProfile ? {
      name: fixtureProfile.name,
      schema_version: fixtureProfile.schemaVersion,
      workload: fixtureProfile.workload,
    } : undefined,
    kubernetes: kubernetes.configuration,
    scenario: {
      name: scenario.path.split('/').at(-1),
      path: scenario.path,
    },
    workload_env: workloadEnv,
  };
  return crypto
    .createHash('sha256')
    .update(stableStringify(canonicalInput))
    .digest('hex');
};

const stableStringify = (value) => JSON.stringify(sortValue(value));

const sortValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (!isRecord(value)) {
    return value;
  }
  return Object.keys(value)
    .sort()
    .reduce((acc, key) => {
      const entry = value[key];
      if (entry !== undefined) {
        acc[key] = sortValue(entry);
      }
      return acc;
    }, {});
};
