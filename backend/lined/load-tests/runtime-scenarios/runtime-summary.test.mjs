import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  RuntimeScenarioRunError,
  buildManifest,
  buildRuntimeSummary,
  ensureLocalBaseUrl,
  parseArgs,
  parseCpuQuantity,
  parseMemoryQuantity,
  parseTopPods,
  summarizeKubernetesState,
} from './runtime-summary.mjs';

const k6Summary = {
  metrics: {
    http_req_duration: {
      values: {
        'p(95)': 250.5,
        'p(99)': 550.25,
      },
    },
    http_req_failed: {
      values: {
        rate: 0.002,
      },
    },
    http_reqs: {
      values: {
        rate: 42.1,
      },
    },
  },
};

const deployment = {
  spec: {
    template: {
      spec: {
        containers: [{
          name: 'backend',
          resources: {
            limits: {
              memory: '1Gi',
            },
            requests: {
              cpu: '500m',
            },
          },
        }],
      },
    },
  },
  status: {
    replicas: 2,
  },
};

const pods = {
  items: [{
    metadata: {
      name: 'lined-backend-a',
    },
    status: {
      containerStatuses: [{
        name: 'backend',
        restartCount: 1,
      }],
    },
  }, {
    metadata: {
      name: 'lined-backend-b',
    },
    status: {
      containerStatuses: [{
        name: 'backend',
        restartCount: 2,
      }],
    },
  }],
};

describe('parseArgs', () => {
  it('accepts valid scenario and workload options', () => {
    const options = parseArgs([
      '--scenario',
      'fixed-medium',
      '--workload',
      'smoke',
      '--k6-env',
      'VUS=2',
    ]);

    assert.equal(options.scenario, 'fixed-medium');
    assert.equal(options.workload, 'smoke');
    assert.equal(options.k6Env.VUS, '2');
  });

  it('rejects unknown scenarios', () => {
    assert.throws(
        () => parseArgs(['--scenario', 'unknown']),
        /--scenario must be one of/
    );
  });

  it('rejects unsupported k6 env keys', () => {
    assert.throws(
        () => parseArgs(['--scenario', 'fixed-medium', '--k6-env', 'TOKEN=secret']),
        /Unsupported k6 env TOKEN/
    );
  });
});

describe('quantity parsing', () => {
  it('parses Kubernetes CPU quantities as millicores', () => {
    assert.equal(parseCpuQuantity('500m'), 500);
    assert.equal(parseCpuQuantity('1'), 1000);
    assert.equal(parseCpuQuantity('250u'), 0.25);
  });

  it('parses Kubernetes memory quantities as bytes', () => {
    assert.equal(parseMemoryQuantity('1Gi'), 1024 ** 3);
    assert.equal(parseMemoryQuantity('512Mi'), 512 * 1024 ** 2);
    assert.equal(parseMemoryQuantity('100M'), 100 * 1000 ** 2);
  });

  it('parses kubectl top pod output', () => {
    assert.deepEqual(parseTopPods('lined-backend-a 250m 512Mi\n'), [{
      cpuMillicores: 250,
      memoryBytes: 512 * 1024 ** 2,
      name: 'lined-backend-a',
    }]);
  });
});

describe('summarizeKubernetesState', () => {
  it('computes utilization ratios from pod usage and deployment resources', () => {
    const result = summarizeKubernetesState({
      deployment,
      pods,
      topOutput: 'lined-backend-a 250m 512Mi\nlined-backend-b 250m 512Mi\n',
    });

    assert.equal(result.cpuUtilization, 0.5);
    assert.equal(result.memoryUtilization, 0.5);
    assert.equal(result.restartCount, 3);
    assert.equal(result.metricsServerAvailable, true);
  });

  it('omits utilization when metrics-server output is missing', () => {
    const result = summarizeKubernetesState({
      deployment,
      pods,
      topOutput: '',
    });

    assert.equal(result.cpuUtilization, undefined);
    assert.equal(result.memoryUtilization, undefined);
    assert.equal(result.metricsServerAvailable, false);
  });

  it('summarizes HPA current and desired replicas', () => {
    const result = summarizeKubernetesState({
      deployment,
      hpa: {
        status: {
          currentReplicas: 2,
          desiredReplicas: 3,
        },
      },
      pods,
      topOutput: '',
    });

    assert.deepEqual(result.hpa, {
      currentReplicas: 2,
      desiredReplicas: 3,
    });
  });
});

describe('buildRuntimeSummary', () => {
  it('builds a collector-compatible summary with missing optional metrics', () => {
    const summary = buildRuntimeSummary({
      k6Summary,
      kubernetes: {
        metricsServerAvailable: false,
        restartCount: 0,
      },
      scenario: 'fixed-medium',
      workload: 'smoke',
    });

    assert.deepEqual(summary, {
      schema_version: 1,
      scenario: 'fixed-medium',
      workload: 'smoke',
      source: 'local-kind',
      summary: {
        latency_p95_ms: 250.5,
        latency_p99_ms: 550.25,
        error_rate: 0.002,
        throughput_rps: 42.1,
        restart_count: 0,
      },
      missing: [
        'availability',
        'cpu_utilization',
        'memory_utilization',
      ],
    });
  });

  it('adds HPA fields when present', () => {
    const summary = buildRuntimeSummary({
      k6Summary,
      kubernetes: {
        cpuUtilization: 0.5,
        hpa: {
          currentReplicas: 2,
          desiredReplicas: 3,
        },
        memoryUtilization: 0.75,
        metricsServerAvailable: true,
        restartCount: 1,
      },
      scenario: 'hpa-cpu',
      workload: 'baseline',
    });

    assert.equal(summary.summary.hpa_current_replicas, 2);
    assert.equal(summary.summary.hpa_desired_replicas, 3);
    assert.deepEqual(summary.missing, ['availability']);
  });
});

describe('ensureLocalBaseUrl', () => {
  it('accepts local targets by default', () => {
    assert.doesNotThrow(() => ensureLocalBaseUrl('http://localhost:8080', false));
    assert.doesNotThrow(() => ensureLocalBaseUrl('http://127.0.0.1:8080', false));
  });

  it('rejects remote targets unless explicitly allowed', () => {
    assert.throws(
        () => ensureLocalBaseUrl('http://example.com', false),
        /BASE_URL must point to localhost/
    );
    assert.doesNotThrow(() => ensureLocalBaseUrl('http://example.com', true));
  });
});

describe('RuntimeScenarioRunError', () => {
  it('preserves partial run result details for failed k6 runs', () => {
    const error = new RuntimeScenarioRunError('k6 failed', {
      manifestPath: '/tmp/runtime-summary-manifest.json',
    });

    assert.equal(error.name, 'RuntimeScenarioRunError');
    assert.equal(error.result.manifestPath, '/tmp/runtime-summary-manifest.json');
  });
});

describe('buildManifest', () => {
  it('records sanitized provenance and HPA cleanup status', () => {
    const manifest = buildManifest({
      cwd: process.cwd(),
      finishedAt: '2026-05-29T08:00:10.000Z',
      hpaCleanup: true,
      k6ExitCode: 0,
      kubernetes: {
        metricsServerAvailable: false,
        replicas: 1,
      },
      options: {
        k6Env: {
          VUS: '2',
        },
        scenario: 'fixed-medium',
        script: 'load-tests/k6/load-test-baseline.js',
        workload: 'smoke',
      },
      scenario: {
        path: 'k8s/kind/scenarios/fixed-medium',
      },
      startedAt: '2026-05-29T08:00:00.000Z',
      summaryExported: true,
      summaryWritten: true,
    });

    assert.equal(manifest.kubernetes.hpa_cleanup, true);
    assert.equal(manifest.collector_summary_written, true);
    assert.equal(manifest.k6.summary_exported, true);
    assert.equal(manifest.workload_env.VUS, '2');
  });
});
