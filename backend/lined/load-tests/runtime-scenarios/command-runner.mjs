import { spawnSync } from 'node:child_process';

export const runCommand = (
  command,
  args,
  { allowFailure = false, capture = false, cwd, timeoutMs } = {}
) => {
  const result = spawnSync(command, args, {
    cwd,
    encoding: capture ? 'utf-8' : undefined,
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    timeout: timeoutMs,
  });

  if (isTimeout(result, timeoutMs) && !allowFailure) {
    throw new Error(`${command} timed out after ${timeoutMs}ms`);
  }
  if (result.error && !allowFailure) {
    throw result.error;
  }
  if (result.signal && !allowFailure) {
    throw new Error(`${command} was killed by signal ${result.signal}`);
  }
  if (!allowFailure && result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
  }

  return result;
};

const isTimeout = (result, timeoutMs) => timeoutMs !== undefined
  && (result.error?.code === 'ETIMEDOUT' || result.signal === 'SIGTERM');
