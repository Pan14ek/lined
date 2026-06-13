import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { runCommand } from './command-runner.mjs';
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

const TEXTS = Object.freeze({
  env: {
    stressThinkTime: 'THINK_TIME_SECONDS',
    token: 'TOKEN',
    userCount: 'USER_COUNT',
    vus: 'VUS',
  },
  fixture: {
    baseline: 'comparison-baseline',
    readHeavy: 'comparison-read-heavy',
    unknown: 'unknown',
    unsafe: 'unsafe',
  },
  scenario: {
    fixedMedium: 'fixed-medium',
    hpaCpu: 'hpa-cpu',
    unknown: 'unknown',
  },
  workload: {
    baseline: 'baseline',
    typo: 'basline',
    readHeavy: 'read-heavy',
    smoke: 'smoke',
    unknown: 'unknown',
  },
});

const VALUES = Object.freeze({
  events: {
    baselineSeedCount: '8',
  },
  tasks: {
    baselineSeedCount: '12',
  },
  thinkTime: {
    none: '0',
  },
  users: {
    baselineCount: '4',
  },
  vus: {
    baseline: '5',
    override: '2',
  },
});

describe('parseArgs', () => {
  it('accepts valid scenario, workload, and allowlisted k6 env options', (t) => {
    t.plan(3);
    const options = parseArgs([
      '--scenario',
      TEXTS.scenario.fixedMedium,
      '--workload',
      TEXTS.workload.smoke,
      '--k6-env',
      `${TEXTS.env.vus}=${VALUES.vus.override}`,
    ]);

    t.assert.equal(options.scenario, TEXTS.scenario.fixedMedium);
    t.assert.equal(options.workload, TEXTS.workload.smoke);
    t.assert.equal(options.k6Env.VUS, VALUES.vus.override);
  });

  it('applies a fixture profile as workload and k6 env defaults', (t) => {
    t.plan(5);
    const options = parseArgs([
      '--scenario',
      TEXTS.scenario.fixedMedium,
      '--fixture-profile',
      TEXTS.fixture.baseline,
    ]);

    t.assert.equal(options.fixtureProfileData.name, TEXTS.fixture.baseline);
    t.assert.equal(options.workload, TEXTS.workload.baseline);
    t.assert.equal(options.k6Env.USER_COUNT, VALUES.users.baselineCount);
    t.assert.equal(options.k6Env.SEED_TASK_COUNT, VALUES.tasks.baselineSeedCount);
    t.assert.equal(options.k6Env.VUS, VALUES.vus.baseline);
  });

  it('lets explicit workload and k6 env override fixture defaults', (t) => {
    t.plan(4);
    const options = parseArgs([
      '--scenario',
      TEXTS.scenario.fixedMedium,
      '--fixture-profile',
      TEXTS.fixture.baseline,
      '--workload',
      TEXTS.workload.readHeavy,
      '--k6-env',
      `${TEXTS.env.vus}=${VALUES.vus.override}`,
      '--k6-env',
      `${TEXTS.env.stressThinkTime}=${VALUES.thinkTime.none}`,
    ]);

    t.assert.equal(options.workload, TEXTS.workload.readHeavy);
    t.assert.equal(options.k6Env.USER_COUNT, VALUES.users.baselineCount);
    t.assert.equal(options.k6Env.VUS, VALUES.vus.override);
    t.assert.equal(options.k6Env.THINK_TIME_SECONDS, VALUES.thinkTime.none);
  });

  it('rejects unknown scenarios and workloads', (t) => {
    t.plan(2);
    t.assert.throws(
      () => parseArgs(['--scenario', TEXTS.scenario.unknown]),
      /--scenario must be one of/
    );
    t.assert.throws(
      () => parseArgs(['--scenario', TEXTS.scenario.fixedMedium, '--workload', TEXTS.workload.unknown]),
      /--workload must be one of/
    );
  });

  it('rejects unknown fixture profiles', (t) => {
    t.plan(1);
    t.assert.throws(
      () => parseArgs(['--scenario', TEXTS.scenario.fixedMedium, '--fixture-profile', TEXTS.fixture.unknown]),
      /--fixture-profile must be one of/
    );
  });

  it('rejects unsupported k6 env keys so secrets are not forwarded', (t) => {
    t.plan(1);
    t.assert.throws(
      () => parseArgs(['--scenario', TEXTS.scenario.fixedMedium, '--k6-env', `${TEXTS.env.token}=secret`]),
      /Unsupported k6 env TOKEN/
    );
  });

  it('rejects unsupported fixture k6 env keys', (t) => {
    t.plan(1);
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lined-fixtures-'));
    const fixtureFile = path.join(directory, 'fixtures.json');
    fs.writeFileSync(fixtureFile, JSON.stringify({
      schema_version: 1,
      profiles: {
        [TEXTS.fixture.unsafe]: {
          workload: TEXTS.workload.baseline,
          k6_env: {
            [TEXTS.env.token]: 'secret',
          },
        },
      },
    }), 'utf-8');

    try {
      t.assert.throws(
        () => loadFixtureProfile(TEXTS.fixture.unsafe, { file: fixtureFile }),
        /unsupported k6 env TOKEN/
      );
    } finally {
      fs.rmSync(directory, { force: true, recursive: true });
    }
  });

  it('rejects unsupported fixture workloads before option validation', (t) => {
    t.plan(1);
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lined-fixtures-'));
    const fixtureFile = path.join(directory, 'fixtures.json');
    fs.writeFileSync(fixtureFile, JSON.stringify({
      schema_version: 1,
      profiles: {
        [TEXTS.fixture.unsafe]: {
          workload: TEXTS.workload.typo,
          k6_env: {},
        },
      },
    }), 'utf-8');

    try {
      t.assert.throws(
        () => parseArgs([
          '--scenario',
          TEXTS.scenario.fixedMedium,
          '--fixture-profile',
          TEXTS.fixture.unsafe,
          '--fixture-profile-file',
          fixtureFile,
        ]),
        /fixture profile unsafe has unsupported workload basline/
      );
    } finally {
      fs.rmSync(directory, { force: true, recursive: true });
    }
  });
});

describe('runCommand', () => {
  it('fails with a timeout-specific message', (t) => {
    t.plan(1);
    t.assert.throws(
      () => runCommand(process.execPath, ['-e', 'setTimeout(() => {}, 1000)'], {
        capture: true,
        timeoutMs: 10,
      }),
      /timed out after 10ms/
    );
  });
});

describe('ensureLocalBaseUrl', () => {
  it('accepts local targets by default', (t) => {
    t.plan(3);
    t.assert.doesNotThrow(() => ensureLocalBaseUrl('http://localhost:8080', false));
    t.assert.doesNotThrow(() => ensureLocalBaseUrl('http://127.0.0.1:8080', false));
    t.assert.doesNotThrow(() => ensureLocalBaseUrl('http://[::1]:8080', false));
  });

  it('rejects remote targets unless explicitly allowed', (t) => {
    t.plan(2);
    t.assert.throws(
      () => ensureLocalBaseUrl('http://example.com', false),
      /BASE_URL must point to localhost/
    );
    t.assert.doesNotThrow(() => ensureLocalBaseUrl('http://example.com', true));
  });
});

describe('runK6', () => {
  it('reports a clear install hint when k6 is missing', (t) => {
    t.plan(1);
    t.assert.throws(
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

  it('builds argv arrays instead of shell command strings', (t) => {
    t.plan(6);
    const calls = [];
    const commandRunner = (command, args, options) => {
      calls.push({ args, command, options });
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

    t.assert.equal(calls[0].command, 'k6');
    t.assert.ok(Array.isArray(calls[0].args));
    t.assert.ok(calls[0].args.includes('--summary-export'));
    t.assert.ok(calls[0].args.includes('VUS=2'));
    t.assert.ok(calls[0].args.includes('ALLOW_REMOTE_BASE_URL=true'));
    t.assert.equal(typeof calls[0].options.timeoutMs, 'number');
  });

  it('reports a signal separately from exit code', (t) => {
    t.plan(2);
    const result = runK6(
      {
        allowRemoteBaseUrl: false,
        baseUrl: 'http://localhost:8080',
        k6Bin: 'k6',
        k6Env: {},
        script: 'load-tests/k6/load-test-baseline.js',
        workload: 'smoke',
      },
      {
        commandRunner: () => ({
          signal: 'SIGTERM',
          status: null,
        }),
      }
    );

    t.assert.equal(result.exitCode, null);
    t.assert.equal(result.signal, 'SIGTERM');
  });
});

describe('Kubernetes state adapter helpers', () => {
  it('deletes stale HPA for fixed scenarios unless skipped', (t) => {
    t.plan(2);
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

    t.assert.equal(cleaned, true);
    t.assert.deepEqual(calls[0], {
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

  it('skips HPA cleanup when requested', (t) => {
    t.plan(2);
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

    t.assert.equal(cleaned, false);
    t.assert.deepEqual(calls, []);
  });

  it('parses Kubernetes resource quantities and pod top output', (t) => {
    t.plan(6);
    t.assert.equal(parseCpuQuantity('500m'), 500);
    t.assert.equal(parseCpuQuantity('1'), 1000);
    t.assert.equal(parseCpuQuantity('250u'), 0.25);
    t.assert.equal(parseMemoryQuantity('1Gi'), 1024 ** 3);
    t.assert.equal(parseMemoryQuantity('512Mi'), 512 * 1024 ** 2);
    t.assert.deepEqual(parseTopPods('lined-backend-a 250m 512Mi\n'), [{
      cpuMillicores: 250,
      memoryBytes: 512 * 1024 ** 2,
      name: 'lined-backend-a',
    }]);
  });

  it('rejects malformed pod top output', (t) => {
    t.plan(1);
    t.assert.throws(
      () => parseTopPods('lined-backend-a 250m\n'),
      /Malformed kubectl top pods line/
    );
  });

  it('summarizes Kubernetes utilization and restarts', (t) => {
    t.plan(4);
    const result = summarizeKubernetesState({
      deployment,
      pods,
      topOutput: 'lined-backend-a 250m 512Mi\nlined-backend-b 250m 512Mi\n',
    });

    t.assert.equal(result.cpuUtilization, 0.5);
    t.assert.equal(result.memoryUtilization, 0.5);
    t.assert.equal(result.restartCount, 3);
    t.assert.equal(result.metricsServerAvailable, true);
  });

  it('omits utilization when metrics-server data is missing', (t) => {
    t.plan(3);
    const result = summarizeKubernetesState({
      deployment,
      pods,
      topOutput: '',
    });

    t.assert.equal(result.cpuUtilization, undefined);
    t.assert.equal(result.memoryUtilization, undefined);
    t.assert.equal(result.metricsServerAvailable, false);
  });
});

describe('buildRuntimeSummary', () => {
  it('builds a collector-compatible summary and records missing optional metrics', (t) => {
    t.plan(1);
    const summary = buildRuntimeSummary({
      k6Summary: nestedK6Summary,
      kubernetes: {
        metricsServerAvailable: false,
        restartCount: 0,
      },
      scenario: 'fixed-medium',
      workload: 'smoke',
    });

    t.assert.deepEqual(summary, {
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

  it('reads flat k6 v2 summary exports', (t) => {
    t.plan(4);
    const summary = buildRuntimeSummary({
      k6Summary: flatK6Summary,
      kubernetes: {
        metricsServerAvailable: false,
        restartCount: 0,
      },
      scenario: 'fixed-medium',
      workload: 'smoke',
    });

    t.assert.equal(summary.summary.latency_p95_ms, 150.25);
    t.assert.equal(summary.summary.latency_p99_ms, 275.5);
    t.assert.equal(summary.summary.error_rate, 0);
    t.assert.equal(summary.summary.throughput_rps, 25.5);
  });

  it('marks missing HPA fields for the HPA scenario when no HPA state is present', (t) => {
    t.plan(2);
    const summary = buildRuntimeSummary({
      k6Summary: nestedK6Summary,
      kubernetes: {
        metricsServerAvailable: false,
        restartCount: 0,
      },
      scenario: 'hpa-cpu',
      workload: 'baseline',
    });

    t.assert.ok(summary.missing.includes('hpa_current_replicas'));
    t.assert.ok(summary.missing.includes('hpa_desired_replicas'));
  });

  it('uses measurement-window restart deltas instead of cumulative snapshots', (t) => {
    t.plan(4);
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

      t.assert.equal(result.summary.summary.restart_count, 2);
      t.assert.equal(result.manifest.kubernetes.restart_count_before, 4);
      t.assert.equal(result.manifest.kubernetes.restart_count_after, 6);
      t.assert.equal(result.manifest.kubernetes.restart_count_delta, 2);
    } finally {
      fs.rmSync(directory, { force: true, recursive: true });
    }
  });

  it('does not emit a negative restart delta when pod counters reset', (t) => {
    t.plan(3);
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

      t.assert.equal(result.summary.summary.restart_count, 0);
      t.assert.equal(result.manifest.kubernetes.restart_count_before, 4);
      t.assert.equal(result.manifest.kubernetes.restart_count_after, 1);
    } finally {
      fs.rmSync(directory, { force: true, recursive: true });
    }
  });

  it('fails without writing a collector summary when k6 omits summary export', (t) => {
    t.plan(5);
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lined-runner-'));

    try {
      let thrown;
      t.assert.throws(
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

      t.assert.equal(thrown instanceof Error, true);
      t.assert.equal(fs.existsSync(path.join(runDir, 'runtime-summary-manifest.json')), true);
      t.assert.equal(fs.existsSync(path.join(runDir, 'runtime-summary.json')), false);
      t.assert.equal(manifest.collector_summary_written, false);
    } finally {
      fs.rmSync(directory, { force: true, recursive: true });
    }
  });
});

describe('manifest and runScenario', () => {
  it('records sanitized provenance in the manifest', (t) => {
    t.plan(9);
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
        signal: undefined,
        summaryTrendStats: 'p(95),p(99),avg,min,max',
      },
      runtimeSummary: {
        missing: ['availability'],
        summary: {
          latency_p95_ms: 250.5,
        },
      },
      kubernetes: {
        configuration: {
          backend: {
            image: 'lined-backend:local',
          },
        },
        image: 'lined-backend:local',
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

    t.assert.equal(manifest.kubernetes.applied_scenario, true);
    t.assert.equal(manifest.kubernetes.hpa_cleanup, true);
    t.assert.equal(manifest.collector_summary_written, true);
    t.assert.deepEqual(manifest.fixture_profile, {
      name: 'comparison-baseline',
      schema_version: 1,
      workload: 'baseline',
      k6_env: {
        USER_COUNT: '4',
        VUS: '2',
      },
    });
    t.assert.equal(manifest.workload_env.VUS, '2');
    t.assert.equal(manifest.git.branch, 'bug/scenario-runner-seam');
    t.assert.equal(manifest.kubernetes.image, 'lined-backend:local');
    t.assert.equal(typeof manifest.provenance.configuration_hash, 'string');
    t.assert.deepEqual(manifest.provenance.runtime_evidence_vector, {
      missing: ['availability'],
      summary: {
        latency_p95_ms: 250.5,
      },
    });
  });

  it('writes a summary and manifest for successful runs', (t) => {
    t.plan(7);
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

      t.assert.equal(fs.existsSync(result.summaryPath), true);
      t.assert.equal(fs.existsSync(result.manifestPath), true);
      t.assert.equal(result.summary.summary.latency_p95_ms, 250.5);
      t.assert.equal(result.summary.fixture_profile, undefined);
      t.assert.equal(result.manifest.collector_summary_written, true);
      t.assert.deepEqual(
        result.manifest.provenance.runtime_evidence_vector.summary,
        result.summary.summary
      );
      t.assert.deepEqual(
        result.manifest.provenance.runtime_evidence_vector.missing,
        result.summary.missing
      );
    } finally {
      fs.rmSync(directory, { force: true, recursive: true });
    }
  });

  it('applies fixture profiles when runScenario is called directly', (t) => {
    t.plan(5);
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lined-runner-'));

    try {
      const result = runScenario(
        {
          allowRemoteBaseUrl: false,
          apply: false,
          baseUrl: 'http://localhost:8080',
          fixtureProfile: TEXTS.fixture.readHeavy,
          k6Bin: 'k6',
          k6Env: {
            VUS: VALUES.vus.override,
          },
          outputRoot: directory,
          scenario: TEXTS.scenario.fixedMedium,
          script: 'load-tests/k6/load-test-baseline.js',
          skipHpaCleanup: false,
          workload: TEXTS.workload.baseline,
        },
        fakeAdapters({
          k6ExitCode: 0,
          k6Summary: nestedK6Summary,
        })
      );

      t.assert.equal(result.summary.workload, TEXTS.workload.readHeavy);
      t.assert.equal(result.manifest.fixture_profile.name, TEXTS.fixture.readHeavy);
      t.assert.equal(result.manifest.workload_env.WORKLOAD, TEXTS.workload.readHeavy);
      t.assert.equal(result.manifest.workload_env.USER_COUNT, VALUES.users.baselineCount);
      t.assert.equal(result.manifest.workload_env.VUS, VALUES.vus.override);
    } finally {
      fs.rmSync(directory, { force: true, recursive: true });
    }
  });

  it('lets direct runScenario workload overrides win over fixture defaults', (t) => {
    t.plan(4);
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lined-runner-'));

    try {
      const result = runScenario(
        {
          allowRemoteBaseUrl: false,
          apply: false,
          baseUrl: 'http://localhost:8080',
          fixtureProfile: TEXTS.fixture.baseline,
          k6Bin: 'k6',
          k6Env: {},
          outputRoot: directory,
          scenario: TEXTS.scenario.fixedMedium,
          script: 'load-tests/k6/load-test-baseline.js',
          skipHpaCleanup: false,
          workload: TEXTS.workload.readHeavy,
        },
        fakeAdapters({
          k6ExitCode: 0,
          k6Summary: nestedK6Summary,
        })
      );

      t.assert.equal(result.summary.workload, TEXTS.workload.readHeavy);
      t.assert.equal(result.manifest.fixture_profile.name, TEXTS.fixture.baseline);
      t.assert.equal(result.manifest.workload_env.WORKLOAD, TEXTS.workload.readHeavy);
      t.assert.equal(result.manifest.workload_env.USER_COUNT, VALUES.users.baselineCount);
    } finally {
      fs.rmSync(directory, { force: true, recursive: true });
    }
  });

  it('lets direct runScenario default workload overrides win when marked explicit', (t) => {
    t.plan(4);
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lined-runner-'));

    try {
      const result = runScenario(
        {
          allowRemoteBaseUrl: false,
          apply: false,
          baseUrl: 'http://localhost:8080',
          fixtureProfile: TEXTS.fixture.readHeavy,
          k6Bin: 'k6',
          k6Env: {},
          outputRoot: directory,
          scenario: TEXTS.scenario.fixedMedium,
          script: 'load-tests/k6/load-test-baseline.js',
          skipHpaCleanup: false,
          workload: TEXTS.workload.baseline,
          workloadExplicit: true,
        },
        fakeAdapters({
          k6ExitCode: 0,
          k6Summary: nestedK6Summary,
        })
      );

      t.assert.equal(result.summary.workload, TEXTS.workload.baseline);
      t.assert.equal(result.manifest.fixture_profile.name, TEXTS.fixture.readHeavy);
      t.assert.equal(result.manifest.workload_env.WORKLOAD, TEXTS.workload.baseline);
      t.assert.equal(result.manifest.workload_env.USER_COUNT, VALUES.users.baselineCount);
    } finally {
      fs.rmSync(directory, { force: true, recursive: true });
    }
  });

  it('uses signal-specific errors when k6 is killed', (t) => {
    t.plan(2);
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lined-runner-'));

    try {
      t.assert.throws(
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
            k6ExitCode: null,
            k6Signal: 'SIGTERM',
            k6Summary: nestedK6Summary,
          })
        ),
        /k6 was killed by signal SIGTERM/
      );

      const runDir = path.join(directory, fs.readdirSync(directory)[0]);
      const manifest = JSON.parse(
        fs.readFileSync(path.join(runDir, 'runtime-summary-manifest.json'), 'utf-8')
      );
      t.assert.equal(manifest.k6.signal, 'SIGTERM');
    } finally {
      fs.rmSync(directory, { force: true, recursive: true });
    }
  });

  it('writes only a manifest when k6 fails', (t) => {
    t.plan(5);
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lined-runner-'));

    try {
      t.assert.throws(
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
      t.assert.equal(runDirs.length, 1);
      const runDir = path.join(directory, runDirs[0]);
      t.assert.equal(fs.existsSync(path.join(runDir, 'runtime-summary-manifest.json')), true);
      t.assert.equal(fs.existsSync(path.join(runDir, 'runtime-summary.json')), false);
      const manifest = JSON.parse(
        fs.readFileSync(path.join(runDir, 'runtime-summary-manifest.json'), 'utf-8')
      );
      t.assert.equal(manifest.provenance.runtime_evidence_vector, undefined);
    } finally {
      fs.rmSync(directory, { force: true, recursive: true });
    }
  });

  it('keeps collector_summary_written false when summary building fails after k6 succeeds', (t) => {
    t.plan(4);
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lined-runner-'));

    try {
      t.assert.throws(
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
            k6Summary: {
              metrics: {
                http_req_duration: {
                  values: {
                    'p(95)': 250.5,
                  },
                },
              },
            },
          })
        ),
        /http_req_duration\.p\(99\)/
      );

      const runDir = path.join(directory, fs.readdirSync(directory)[0]);
      const manifest = JSON.parse(
        fs.readFileSync(path.join(runDir, 'runtime-summary-manifest.json'), 'utf-8')
      );
      t.assert.equal(manifest.collector_summary_written, false);
      t.assert.equal(fs.existsSync(path.join(runDir, 'runtime-summary.json')), false);
      t.assert.match(manifest.provenance.summary_failure, /http_req_duration\.p\(99\)/);
    } finally {
      fs.rmSync(directory, { force: true, recursive: true });
    }
  });
});

const fakeAdapters = ({
  k6ExitCode,
  k6Signal,
  k6Summary,
  restartCounts = [0, 0],
}) => ({
  clock: fakeClock(),
  gitReader: () => ({
    branch: 'bug/scenario-runner-seam',
    commit: 'abc123',
  }),
  k6Adapter: {
    assertAvailable: () => {},
    run: () => ({
      exitCode: k6ExitCode,
      signal: k6Signal,
      summary: k6Summary,
    }),
  },
  kubernetesAdapter: {
    applyScenarioIfNeeded: () => false,
    cleanupHpaIfNeeded: () => true,
    collectState: () => {
      const restartCount = restartCounts.shift() ?? restartCounts.at(-1) ?? 0;
      return {
        configuration: {
          backend: {
            image: 'lined-backend:local',
            probes: {},
            resources: {},
          },
          replicas: 1,
        },
        image: 'lined-backend:local',
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
