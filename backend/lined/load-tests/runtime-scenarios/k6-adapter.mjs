import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCommand } from './command-runner.mjs';
import { parseK6Summary } from './runtime-summary.mjs';

export const SUMMARY_TREND_STATS = 'p(95),p(99),avg,min,max';
export const K6_PREFLIGHT_TIMEOUT_MS = 30_000;
export const K6_RUN_TIMEOUT_MS = 600_000;

export const assertK6Available = (
  k6Bin,
  { commandRunner = runCommand, cwd = process.cwd() } = {}
) => {
  const result = commandRunner(k6Bin, ['version'], {
    allowFailure: true,
    capture: true,
    cwd,
    timeoutMs: K6_PREFLIGHT_TIMEOUT_MS,
  });

  if (result.error?.code === 'ENOENT') {
    throw new Error(
      `k6 executable not found: ${k6Bin}. `
      + 'Install k6 and make it available in PATH, or pass --k6-bin /absolute/path/to/k6. '
      + 'On macOS with Homebrew: brew install k6.'
    );
  }
  if (result.error) {
    throw result.error;
  }
  if (result.signal) {
    throw new Error(`k6 preflight was killed by signal ${result.signal}`);
  }
  if (result.status !== 0) {
    throw new Error(`k6 preflight failed with exit code ${result.status}`);
  }
};

export const runK6 = (
  options,
  { commandRunner = runCommand, cwd = process.cwd() } = {}
) => {
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

  const result = commandRunner(options.k6Bin, args, {
    allowFailure: true,
    cwd,
    timeoutMs: K6_RUN_TIMEOUT_MS,
  });

  try {
    return {
      args,
      exitCode: result.signal ? null : result.status,
      signal: result.signal ?? undefined,
      summary: fs.existsSync(summaryPath)
        ? parseK6Summary(fs.readFileSync(summaryPath, 'utf-8'))
        : undefined,
    };
  } finally {
    fs.rmSync(tempDir, { force: true, recursive: true });
  }
};
