import fs from 'node:fs';
import path from 'node:path';

export const FIXTURE_PROFILES_PATH = 'load-tests/runtime-scenarios/fixture-profiles-v1.json';
export const K6_ENV_KEYS = new Set([
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

const PROFILE_KEYS = new Set(['description', 'workload', 'k6_env']);

export const fixtureProfileNames = ({ cwd = process.cwd(), file = FIXTURE_PROFILES_PATH } = {}) => {
  const artifact = readFixtureArtifact(cwd, file);
  return Object.keys(artifact.profiles).sort();
};

export const loadFixtureProfile = (
  name,
  { allowedWorkloads, cwd = process.cwd(), file = FIXTURE_PROFILES_PATH } = {}
) => {
  const artifact = readFixtureArtifact(cwd, file);
  const profile = artifact.profiles[name];
  if (!profile) {
    throw new Error(`--fixture-profile must be one of: ${Object.keys(artifact.profiles).sort().join(', ')}`);
  }
  validateProfile(name, profile, allowedWorkloads);
  return {
    description: profile.description,
    k6Env: { ...profile.k6_env },
    name,
    schemaVersion: artifact.schema_version,
    workload: profile.workload,
  };
};

export const applyFixtureProfileDefaults = (
  options,
  {
    cwd = process.cwd(),
    explicitK6Env = {},
    fixtureFile = FIXTURE_PROFILES_PATH,
    allowedWorkloads,
    workloadExplicit = false,
  } = {}
) => {
  if (!options.fixtureProfile) {
    return options;
  }

  const profile = loadFixtureProfile(options.fixtureProfile, {
    allowedWorkloads,
    cwd,
    file: fixtureFile,
  });
  const merged = {
    ...options,
    fixtureProfileData: profile,
    k6Env: {
      ...profile.k6Env,
      ...explicitK6Env,
    },
  };
  if (!workloadExplicit) {
    merged.workload = profile.workload;
  }
  return merged;
};

const readFixtureArtifact = (cwd, file) => {
  const artifactPath = path.resolve(cwd, file);
  const parsed = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'));
  if (!isRecord(parsed) || parsed.schema_version !== 1 || !isRecord(parsed.profiles)) {
    throw new Error('fixture profile artifact must contain schema_version 1 and profiles');
  }
  return parsed;
};

const validateProfile = (name, profile, allowedWorkloads) => {
  requireRecord(`fixture profile ${name}`, profile);
  requireKnownProfileKeys(name, profile);
  requireWorkload(name, profile.workload, allowedWorkloads);
  requireK6Env(name, profile.k6_env);
};

const requireRecord = (label, value) => {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object`);
  }
};

const requireKnownProfileKeys = (name, profile) => {
  const unknownKeys = Object.keys(profile).filter((key) => !PROFILE_KEYS.has(key));
  if (unknownKeys.length > 0) {
    throw new Error(`fixture profile ${name} has unsupported keys: ${unknownKeys.join(', ')}`);
  }
};

const requireWorkload = (name, workload, allowedWorkloads) => {
  if (typeof workload !== 'string' || workload.length === 0) {
    throw new Error(`fixture profile ${name} must define workload`);
  }
  if (allowedWorkloads && !allowedWorkloads.has(workload)) {
    throw new Error(
      `fixture profile ${name} has unsupported workload ${workload}; `
      + `allowed: ${Array.from(allowedWorkloads).join(', ')}`
    );
  }
};

const requireK6Env = (name, k6Env) => {
  requireRecord(`fixture profile ${name} k6_env`, k6Env);
  Object.entries(k6Env).forEach(([key, value]) => requireK6EnvEntry(name, key, value));
};

const requireK6EnvEntry = (name, key, value) => {
  if (!K6_ENV_KEYS.has(key)) {
    throw new Error(`fixture profile ${name} has unsupported k6 env ${key}`);
  }
  if (typeof value !== 'string') {
    throw new Error(`fixture profile ${name} k6 env ${key} must be a string`);
  }
};

const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
