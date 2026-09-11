import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import path from 'node:path';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(scriptDir, '..');
const repoDir = path.resolve(webDir, '..');
const backendDir = path.join(repoDir, 'backend', 'lined');
const runtime = process.env.E2E_CONTAINER_RUNTIME ?? 'docker';
const image = process.env.E2E_POSTGRES_IMAGE ?? 'postgres:16-alpine';
const runId = `${Date.now()}-${process.pid}`;
const containerName = `lined-e2e-postgres-${runId}`;
const playwrightArgs = process.argv.slice(2);

let postgresStarted = false;
let backendProcess;
let frontendProcess;
let cleaningUp = false;

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const findFreePort = async () => {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : undefined;
  await new Promise((resolve) => server.close(resolve));
  if (!port) throw new Error('Could not allocate a local port.');
  return port;
};

const runCommand = (command, args, options = {}) => new Promise((resolve, reject) => {
  const child = spawn(command, args, {
    cwd: options.cwd ?? repoDir,
    env: options.env ?? process.env,
    stdio: options.stdio ?? ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout?.on('data', (chunk) => { stdout += chunk; });
  child.stderr?.on('data', (chunk) => { stderr += chunk; });
  child.once('error', reject);
  child.once('exit', (code, signal) => {
    if (code === 0) {
      resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
      return;
    }
    reject(new Error(`${command} ${args.join(' ')} failed (${code ?? signal}).\n${stderr.trim()}`));
  });
});

const processTail = (child) => {
  const lines = [];
  const append = (chunk) => {
    lines.push(...String(chunk).split('\n'));
    if (lines.length > 120) lines.splice(0, lines.length - 120);
  };
  child.stdout?.on('data', append);
  child.stderr?.on('data', append);
  return lines;
};

const spawnService = (command, args, env) => {
  const child = spawn(command, args, {
    cwd: command === 'bash' ? backendDir : webDir,
    env,
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const tail = processTail(child);
  child.once('error', (error) => tail.push(String(error)));
  return { child, tail };
};

const waitForHttp = async (url, service, timeoutMs = 120_000) => {
  const deadline = Date.now() + timeoutMs;
  let lastError = 'not attempted';
  while (Date.now() < deadline) {
    if (service?.child.exitCode != null) {
      throw new Error(`Service exited before ${url} became ready.\n${service.tail.join('\n')}`);
    }
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(3_000) });
      if (response.ok) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await delay(250);
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError}\n${service?.tail.join('\n') ?? ''}`);
};

const waitForPostgres = async (port) => {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      await runCommand(runtime, [
        'exec', containerName, 'pg_isready', '-U', 'lined_e2e', '-d', 'lined_e2e',
      ]);
      return;
    } catch {
      await delay(250);
    }
  }
  throw new Error(`Timed out waiting for PostgreSQL on mapped port ${port}.`);
};

const terminate = async (service) => {
  if (!service || service.child.exitCode != null) return;
  try {
    if (process.platform !== 'win32' && service.child.pid) {
      process.kill(-service.child.pid, 'SIGTERM');
    } else {
      service.child.kill('SIGTERM');
    }
  } catch {
    // The service may have exited between the status check and the signal.
  }
  await Promise.race([once(service.child, 'exit'), delay(5_000)]);
  if (service.child.exitCode == null) {
    try {
      if (process.platform !== 'win32' && service.child.pid) process.kill(-service.child.pid, 'SIGKILL');
      else service.child.kill('SIGKILL');
    } catch {
      // Nothing remains to terminate.
    }
  }
};

const cleanup = async () => {
  if (cleaningUp) return;
  cleaningUp = true;
  await terminate(frontendProcess);
  await terminate(backendProcess);
  if (postgresStarted) {
    try {
      await runCommand(runtime, ['rm', '--force', containerName]);
    } catch {
      // --rm containers normally disappear after stop; cleanup is best effort.
    }
  }
};

const onSignal = async (signal) => {
  await cleanup();
  process.exit(128 + (signal === 'SIGINT' ? 2 : 15));
};

process.once('SIGINT', () => void onSignal('SIGINT'));
process.once('SIGTERM', () => void onSignal('SIGTERM'));

try {
  const backendPort = await findFreePort();
  const frontendPort = await findFreePort();
  const postgres = await runCommand(runtime, [
    'run', '--detach', '--rm', '--name', containerName,
    '-e', 'POSTGRES_DB=lined_e2e',
    '-e', 'POSTGRES_USER=lined_e2e',
    '-e', 'POSTGRES_PASSWORD=lined_e2e',
    '-e', 'TZ=UTC', '-e', 'PGTZ=UTC',
    '-p', '127.0.0.1::5432', image,
  ]);
  postgresStarted = true;
  if (!postgres.stdout) throw new Error('PostgreSQL container did not return an id.');
  const portMapping = await runCommand(runtime, ['port', containerName, '5432/tcp']);
  const mappedPort = Number(portMapping.stdout.match(/:(\d+)\s*$/m)?.[1]);
  if (!mappedPort) throw new Error(`Could not determine PostgreSQL port from: ${portMapping.stdout}`);
  await waitForPostgres(mappedPort);

  const backendEnv = {
    ...process.env,
    GRADLE_USER_HOME: process.env.E2E_GRADLE_USER_HOME ?? path.join(tmpdir(), `lined-e2e-gradle-${runId}`),
    SERVER_PORT: String(backendPort),
    SPRING_DATASOURCE_URL: `jdbc:postgresql://127.0.0.1:${mappedPort}/lined_e2e?options=-c%20TimeZone=UTC`,
    SPRING_DATASOURCE_USERNAME: 'lined_e2e',
    SPRING_DATASOURCE_PASSWORD: 'lined_e2e',
    LINED_JWT_SECRET: 'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=',
    LINED_PASSWORD_RESET_TOKEN_SECRET: 'lined-e2e-password-reset-secret-2026',
    LINED_SECURITY_REFRESH_COOKIE_SECURE: 'false',
    LINED_SECURITY_CORS_ALLOWED_ORIGINS: `http://127.0.0.1:${frontendPort}`,
    FEATURE_FLAG_ENVIRONMENT: 'LOCAL',
    OTEL_SDK_DISABLED: 'true',
  };
  backendProcess = spawnService('bash', ['./gradlew', 'bootRun', '--no-daemon'], backendEnv);
  await waitForHttp(`http://127.0.0.1:${backendPort}/actuator/health/readiness`, backendProcess);

  const frontendEnv = {
    ...process.env,
    VITE_API_BASE_URL: `http://127.0.0.1:${backendPort}/api`,
    VITE_ENABLE_MSW: 'false',
    VITE_USE_MOCKS: 'false',
  };
  await runCommand('npm', ['run', 'build'], { cwd: webDir, env: frontendEnv });
  frontendProcess = spawnService('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(frontendPort)], frontendEnv);
  await waitForHttp(`http://127.0.0.1:${frontendPort}/sign-in`, frontendProcess);

  const testEnv = {
    ...process.env,
    E2E_BASE_URL: `http://127.0.0.1:${frontendPort}`,
    E2E_API_BASE_URL: `http://127.0.0.1:${backendPort}/api`,
    E2E_RUN_ID: runId,
  };
  const playwright = await runCommand('npx', ['--no-install', 'playwright', 'test', ...playwrightArgs], {
    cwd: webDir,
    env: testEnv,
    stdio: 'inherit',
  });
  void playwright;
  await cleanup();
} catch (error) {
  await cleanup();
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
