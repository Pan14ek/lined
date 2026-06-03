import { spawnSync } from 'node:child_process';

export const runCommand = (
  command,
  args,
  { allowFailure = false, capture = false, cwd } = {}
) => {
  const result = spawnSync(command, args, {
    cwd,
    encoding: capture ? 'utf-8' : undefined,
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });

  if (result.error && !allowFailure) {
    throw result.error;
  }
  if (!allowFailure && result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
  }

  return result;
};
