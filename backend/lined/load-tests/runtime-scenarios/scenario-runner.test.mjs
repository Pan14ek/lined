import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { assertK6Available, runK6 } from './k6-adapter.mjs';
import {
  cleanupHpaIfNeeded,
  parseCpuQuantity,
  parseMemoryQuantity,
  parseTopPods,
  summarizeKubernetesState,
} from './kubernetes-adapter.mjs';
import {
  ScenarioRunError,
  ensureLocalBaseUrl,
  parseArgs,
  runScenario,
} from './scenario-runner.mjs';
import { buildManifest, buildRuntimeSummary } from './runtime-summary.mjs';
import { loadFixtureProfile } from './fixture-profiles.mjs';

const nestedK6Summary = {
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

const flatK6Summary = {
  metrics: {
    http_req_duration: {
      'p(95)': 150.25,
      'p(99)': 275.5,
    },
    http_req_failed: {
      fails: 0,
      passes: 100,
      value: 0,
    },
    http_reqs: {
      count: 100,
      rate: 25.5,
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
    status: {
      containerStatuses: [{
        name: 'backend',
        restartCount: 1,
      }],
    },
  }, {
    status: {
      containerStatuses: [{
        name: 'backend',
        restartCount: 2,
      }],
    },
  }],
};

describe('parseArgs', () => {
  it('accepts valid scenario, workload, and allowlisted k6 env options', () => {
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

  it('applies a fixture profile as workload and k6 env defaults', () => {
    const options = parseArgs([
      '--scenario',
      'fixed-medium',
      '--fixture-profile',
      'comparison-baseline',
    ]);

    assert.equal(options.fixtureProfileData.name, 'comparison-baseline');
    assert.equal(options.workload, 'baseline');
    assert.equal(options.k6Env.USER_COUNT, '4');
    assert.equal(options.k6Env.SEED_TASK_COUNT, '12');
    assert.equal(options.k6Env.VUS, '5');
  });

  it('lets explicit workload and k6 env override fixture defaults', () => {
    const options = parseArgs([
      '--scenario',
      'fixed-medium',
      '--fixture-profile',
      'comparison-baseline',
      '--workload',
      'read-heavy',
      '--k6-env',
      'VUS=2',
      '--k6-env',
      'THINK_TIME_SECONDS=0',
    ]);

    assert.equal(options.workload, 'read-heavy');
    assert.equal(options.k6Env.USER_COUNT, '4');
    assert.equal(options.k6Env.VUS, '2');
    assert.equal(options.k6Env.THINK_TIME_SECONDS, '0');
  });

  it('rejects unknown scenarios and workloads', () => {
    assert.throws(
      () => parseArgs(['--scenario', 'unknown']),
      /--scenario must be one of/
    );
    assert.throws(
      () => parseArgs(['--scenario', 'fixed-medium', '--workload', 'unknown']),
      /--workload must be one of/
    );
  });

  it('rejects unknown fixture profiles', () => {
    assert.throws(
      () => parseArgs(['--scenario', 'fixed-medium', '--fixture-profile', 'unknown']),
      /--fixture-profile must be one of/
    );
  });

  it('rejects unsupported k6 env keys so secrets are not forwarded', () => {
    assert.throws(
      () => parseArgs(['--scenario', 'fixed-medium', '--k6-env', 'TOKEN=secret']),
      /Unsupported k6 env TOKEN/
    );
  });

  it('rejects unsupported fixture k6 env keys', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lined-fixtures-'));
    const fixtureFile = path.join(directory, 'fixtures.json');
    fs.writeFileSync(fixtureFile, JSON.stringify({
      schema_version: 1,
      profiles: {
        unsafe: {
          workload: 'baseline',
          k6_env: {
            TOKEN: 'secret',
          },
        },
      },
    }), 'utf-8');

    try {
      assert.throws(
        () => loadFixtureProfile('unsafe', { file: fixtureFile }),
        /unsupported k6 env TOKEN/
      );
    } finally {
      fs.rmSync(directory, { force: true, recursive: true });
    }
  });
});

describe('ensureLocalBaseUrl', () => {
  it('accepts local targets by default', () => {
    assert.doesNotThrow(() => ensureLocalBaseUrl('http://localhost:8080', false));
    assert.doesNotThrow(() => ensureLocalBaseUrl('http://127.0.0.1:8080', false));
    assert.doesNotThrow(() => ensureLocalBaseUrl('http://[::1]:8080', false));
  });

  it('rejects remote targets unless explicitly allowed', () => {
    assert.throws(
      () => ensureLocalBaseUrl('http://example.com', false),
      /BASE_URL must point to localhost/
    );
    assert.doesNotThrow(() => ensureLocalBaseUrl('http://example.com', true));
  });
});

describe('runK6', () => {
  it('reports a clear install hint when k6 is missing', () => {
    assert.throws(
      () => assertK6Available('missing-k6', {
        commandRunner: () => ({
          error: Object.assign(new Error('spawn missing-k6 ENOENT'), {
            code: 'ENOENT',
          }),
          status: null,
        }),
      }),
      /Install k6/
    );
  });

  it('builds argv arrays instead of shell command strings', () => {
    const calls = [];
    const commandRunner = (command, args) => {
      calls.push({ args, command });
      return { status: 0 };
    };

    runK6(
      {
        allowRemoteBaseUrl: true,
        baseUrl: 'http://localhost:8080',
        k6Bin: 'k6',
        k6Env: {
          VUS: '2',
        },
        script: 'load-tests/k6/load-test-baseline.js',
        workload: 'smoke',
      },
      { commandRunner }
    );

    assert.equal(calls[0].command, 'k6');
    assert.ok(Array.isArray(calls[0].args));
    assert.ok(calls[0].args.includes('--summary-export'));
    assert.ok(calls[0].args.includes('VUS=2'));
    assert.ok(calls[0].args.includes('ALLOW_REMOTE_BASE_URL=true'));
  });
});

describe('Kubernetes state adapter helpers', () => {
  it('deletes stale HPA for fixed scenarios unless skipped', () => {
    const calls = [];
    const commandRunner = (command, args) => {
      calls.push({ args, command });
      return { status: 0 };
    };

    const cleaned = cleanupHpaIfNeeded(
      { skipHpaCleanup: false },
      { fixedReplicas: true },
      { commandRunner }
    );

    assert.equal(cleaned, true);
    assert.deepEqual(calls[0], {
      command: 'kubectl',
      args: [
        '-n',
        'lined',
        'delete',
        'hpa',
        'lined-backend',
        '--ignore-not-found',
      ],
    });
  });

  it('skips HPA cleanup when requested', () => {
    const calls = [];
    const cleaned = cleanupHpaIfNeeded(
      { skipHpaCleanup: true },
      { fixedReplicas: true },
      {
        commandRunner: (command, args) => {
          calls.push({ args, command });
          return { status: 0 };
        },
      }
    );

    assert.equal(cleaned, false);
    assert.deepEqual(calls, []);
  });

  it('parses Kubernetes resource quantities and pod top output', () => {
    assert.equal(parseCpuQuantity('500m'), 500);
    assert.equal(parseCpuQuantity('1'), 1000);
    assert.equal(parseCpuQuantity('250u'), 0.25);
    assert.equal(parseMemoryQuantity('1Gi'), 1024 ** 3);
    assert.equal(parseMemoryQuantity('512Mi'), 512 * 1024 ** 2);
    assert.deepEqual(parseTopPods('lined-backend-a 250m 512Mi\n'), [{
      cpuMillicores: 250,
      memoryBytes: 512 * 1024 ** 2,
      name: 'lined-backend-a',
    }]);
  });

  it('summarizes Kubernetes utilization and restarts', () => {
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

  it('omits utilization when metrics-server data is missing', () => {
    const result = summarizeKubernetesState({
      deployment,
      pods,
      topOutput: '',
    });

    assert.equal(result.cpuUtilization, undefined);
    assert.equal(result.memoryUtilization, undefined);
    assert.equal(result.metricsServerAvailable, false);
  });
});

describe('buildRuntimeSummary', () => {
  it('builds a collector-compatible summary and records missing optional metrics', () => {
    const summary = buildRuntimeSummary({
      k6Summary: nestedK6Summary,
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

  it('reads flat k6 v2 summary exports', () => {
    const summary = buildRuntimeSummary({
      k6Summary: flatK6Summary,
      kubernetes: {
        metricsServerAvailable: false,
        restartCount: 0,
      },
      scenario: 'fixed-medium',
      workload: 'smoke',
    });

    assert.equal(summary.summary.latency_p95_ms, 150.25);
    assert.equal(summary.summary.latency_p99_ms, 275.5);
    assert.equal(summary.summary.error_rate, 0);
    assert.equal(summary.summary.throughput_rps, 25.5);
  });

  it('marks missing HPA fields for the HPA scenario when no HPA state is present', () => {
    const summary = buildRuntimeSummary({
      k6Summary: nestedK6Summary,
      kubernetes: {
        metricsServerAvailable: false,
        restartCount: 0,
      },
      scenario: 'hpa-cpu',
      workload: 'baseline',
    });

    assert.ok(summary.missing.includes('hpa_current_replicas'));
    assert.ok(summary.missing.includes('hpa_desired_replicas'));
  });

  it('uses measurement-window restart deltas instead of cumulative snapshots', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lined-runner-'));

    try {
      const result = runScenario(
        {
          allowRemoteBaseUrl: false,
          apply: false,
          baseUrl: 'http://localhost:8080',
          k6Bin: 'k6',
          k6Env: {},
          outputRoot: directory,
          scenario: 'fixed-medium',
          script: 'load-tests/k6/load-test-baseline.js',
          skipHpaCleanup: false,
          workload: 'smoke',
        },
        fakeAdapters({
          k6ExitCode: 0,
          k6Summary: nestedK6Summary,
          restartCounts: [4, 6],
        })
      );

      assert.equal(result.summary.summary.restart_count, 2);
      assert.equal(result.manifest.kubernetes.restart_count_before, 4);
      assert.equal(result.manifest.kubernetes.restart_count_after, 6);
      assert.equal(result.manifest.kubernetes.restart_count_delta, 2);
    } finally {
      fs.rmSync(directory, { force: true, recursive: true });
    }
  });

  it('does not emit a negative restart delta when pod counters reset', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lined-runner-'));

    try {
      const result = runScenario(
        {
          allowRemoteBaseUrl: false,
          apply: false,
          baseUrl: 'http://localhost:8080',
          k6Bin: 'k6',
          k6Env: {},
          outputRoot: directory,
          scenario: 'fixed-medium',
          script: 'load-tests/k6/load-test-baseline.js',
          skipHpaCleanup: false,
          workload: 'smoke',
        },
        fakeAdapters({
          k6ExitCode: 0,
          k6Summary: nestedK6Summary,
          restartCounts: [4, 1],
        })
      );

      assert.equal(result.summary.summary.restart_count, 0);
      assert.equal(result.manifest.kubernetes.restart_count_before, 4);
      assert.equal(result.manifest.kubernetes.restart_count_after, 1);
    } finally {
      fs.rmSync(directory, { force: true, recursive: true });
    }
  });

  it('fails without writing a collector summary when k6 omits summary export', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lined-runner-'));

    try {
      let thrown;
      assert.throws(
        () => runScenario(
          {
            allowRemoteBaseUrl: false,
            apply: false,
            baseUrl: 'http://localhost:8080',
            k6Bin: 'k6',
            k6Env: {},
            outputRoot: directory,
            scenario: 'fixed-medium',
            script: 'load-tests/k6/load-test-baseline.js',
            skipHpaCleanup: false,
            workload: 'smoke',
          },
          fakeAdapters({
            k6ExitCode: 0,
            k6Summary: undefined,
          })
        ),
        (error) => {
          thrown = error;
          return /summary export/.test(error.message);
        }
      );

      const runDirs = fs.readdirSync(directory);
      const runDir = path.join(directory, runDirs[0]);
      const manifest = JSON.parse(
        fs.readFileSync(path.join(runDir, 'runtime-summary-manifest.json'), 'utf-8')
      );

      assert.equal(thrown instanceof Error, true);
      assert.equal(fs.existsSync(path.join(runDir, 'runtime-summary-manifest.json')), true);
      assert.equal(fs.existsSync(path.join(runDir, 'runtime-summary.json')), false);
      assert.equal(manifest.collector_summary_written, false);
    } finally {
      fs.rmSync(directory, { force: true, recursive: true });
    }
  });
});

describe('manifest and runScenario', () => {
  it('records sanitized provenance in the manifest', () => {
    const manifest = buildManifest({
      appliedScenario: true,
      finishedAt: '2026-06-01T10:00:10.000Z',
      git: {
        branch: 'bug/scenario-runner-seam',
        commit: 'abc123',
      },
      hpaCleanup: true,
      k6: {
        exitCode: 0,
        summaryTrendStats: 'p(95),p(99),avg,min,max',
      },
      kubernetes: {
        metricsServerAvailable: false,
        replicas: 1,
      },
      options: {
        baseUrl: 'http://localhost:8080',
        fixtureProfileData: {
          k6Env: {
            USER_COUNT: '4',
            VUS: '2',
          },
          name: 'comparison-baseline',
          schemaVersion: 1,
          workload: 'baseline',
        },
        k6Bin: 'k6',
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
      startedAt: '2026-06-01T10:00:00.000Z',
      summaryExported: true,
      summaryWritten: true,
    });

    assert.equal(manifest.kubernetes.applied_scenario, true);
    assert.equal(manifest.kubernetes.hpa_cleanup, true);
    assert.equal(manifest.collector_summary_written, true);
    assert.deepEqual(manifest.fixture_profile, {
      name: 'comparison-baseline',
      schema_version: 1,
      workload: 'baseline',
      k6_env: {
        USER_COUNT: '4',
        VUS: '2',
      },
    });
    assert.equal(manifest.workload_env.VUS, '2');
    assert.equal(manifest.git.branch, 'bug/scenario-runner-seam');
  });

  it('writes a summary and manifest for successful runs', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lined-runner-'));

    try {
      const result = runScenario(
        {
          allowRemoteBaseUrl: false,
          apply: false,
          baseUrl: 'http://localhost:8080',
          k6Bin: 'k6',
          k6Env: {},
          outputRoot: directory,
          scenario: 'fixed-medium',
          script: 'load-tests/k6/load-test-baseline.js',
          skipHpaCleanup: false,
          workload: 'smoke',
        },
        fakeAdapters({
          k6ExitCode: 0,
          k6Summary: nestedK6Summary,
        })
      );

      assert.equal(fs.existsSync(result.summaryPath), true);
      assert.equal(fs.existsSync(result.manifestPath), true);
      assert.equal(result.summary.summary.latency_p95_ms, 250.5);
      assert.equal(result.summary.fixture_profile, undefined);
      assert.equal(result.manifest.collector_summary_written, true);
    } finally {
      fs.rmSync(directory, { force: true, recursive: true });
    }
  });

  it('applies fixture profiles when runScenario is called directly', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lined-runner-'));

    try {
      const result = runScenario(
        {
          allowRemoteBaseUrl: false,
          apply: false,
          baseUrl: 'http://localhost:8080',
          fixtureProfile: 'comparison-read-heavy',
          k6Bin: 'k6',
          k6Env: {
            VUS: '2',
          },
          outputRoot: directory,
          scenario: 'fixed-medium',
          script: 'load-tests/k6/load-test-baseline.js',
          skipHpaCleanup: false,
          workload: 'baseline',
        },
        fakeAdapters({
          k6ExitCode: 0,
          k6Summary: nestedK6Summary,
        })
      );

      assert.equal(result.summary.workload, 'read-heavy');
      assert.equal(result.manifest.fixture_profile.name, 'comparison-read-heavy');
      assert.equal(result.manifest.workload_env.WORKLOAD, 'read-heavy');
      assert.equal(result.manifest.workload_env.USER_COUNT, '4');
      assert.equal(result.manifest.workload_env.VUS, '2');
    } finally {
      fs.rmSync(directory, { force: true, recursive: true });
    }
  });

  it('lets direct runScenario workload overrides win over fixture defaults', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lined-runner-'));

    try {
      const result = runScenario(
        {
          allowRemoteBaseUrl: false,
          apply: false,
          baseUrl: 'http://localhost:8080',
          fixtureProfile: 'comparison-baseline',
          k6Bin: 'k6',
          k6Env: {},
          outputRoot: directory,
          scenario: 'fixed-medium',
          script: 'load-tests/k6/load-test-baseline.js',
          skipHpaCleanup: false,
          workload: 'read-heavy',
        },
        fakeAdapters({
          k6ExitCode: 0,
          k6Summary: nestedK6Summary,
        })
      );

      assert.equal(result.summary.workload, 'read-heavy');
      assert.equal(result.manifest.fixture_profile.name, 'comparison-baseline');
      assert.equal(result.manifest.workload_env.WORKLOAD, 'read-heavy');
      assert.equal(result.manifest.workload_env.USER_COUNT, '4');
    } finally {
      fs.rmSync(directory, { force: true, recursive: true });
    }
  });

  it('writes only a manifest when k6 fails', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lined-runner-'));

    try {
      assert.throws(
        () => runScenario(
          {
            allowRemoteBaseUrl: false,
            apply: false,
            baseUrl: 'http://localhost:8080',
            k6Bin: 'k6',
            k6Env: {},
            outputRoot: directory,
            scenario: 'fixed-medium',
            script: 'load-tests/k6/load-test-baseline.js',
            skipHpaCleanup: false,
            workload: 'smoke',
          },
          fakeAdapters({
            k6ExitCode: 1,
            k6Summary: nestedK6Summary,
          })
        ),
        ScenarioRunError
      );

      const runDirs = fs.readdirSync(directory);
      assert.equal(runDirs.length, 1);
      const runDir = path.join(directory, runDirs[0]);
      assert.equal(fs.existsSync(path.join(runDir, 'runtime-summary-manifest.json')), true);
      assert.equal(fs.existsSync(path.join(runDir, 'runtime-summary.json')), false);
    } finally {
      fs.rmSync(directory, { force: true, recursive: true });
    }
  });
});

const fakeAdapters = ({ k6ExitCode, k6Summary, restartCounts = [0, 0] }) => ({
  clock: fakeClock(),
  gitReader: () => ({
    branch: 'bug/scenario-runner-seam',
    commit: 'abc123',
  }),
  k6Adapter: {
    assertAvailable: () => {},
    run: () => ({
      exitCode: k6ExitCode,
      summary: k6Summary,
    }),
  },
  kubernetesAdapter: {
    applyScenarioIfNeeded: () => false,
    cleanupHpaIfNeeded: () => true,
    collectState: () => {
      const restartCount = restartCounts.shift() ?? restartCounts.at(-1) ?? 0;
      return {
        metricsServerAvailable: false,
        replicas: 1,
        restartCount,
      };
    },
    waitForRollout: () => {},
  },
});

const fakeClock = () => {
  const times = [
    '2026-06-01T10:00:00.000Z',
    '2026-06-01T10:00:10.000Z',
  ];
  return () => times.shift() ?? '2026-06-01T10:00:10.000Z';
};
