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
  { cwd = process.cwd(), file = FIXTURE_PROFILES_PATH } = {}
) => {
  const artifact = readFixtureArtifact(cwd, file);
  const profile = artifact.profiles[name];
  if (!profile) {
    throw new Error(`--fixture-profile must be one of: ${Object.keys(artifact.profiles).sort().join(', ')}`);
  }
  validateProfile(name, profile);
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
    workloadExplicit = false,
  } = {}
) => {
  if (!options.fixtureProfile) {
    return options;
  }

  const profile = loadFixtureProfile(options.fixtureProfile, { cwd, file: fixtureFile });
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

const validateProfile = (name, profile) => {
  if (!isRecord(profile)) {
    throw new Error(`fixture profile ${name} must be an object`);
  }
  const unknownKeys = Object.keys(profile).filter((key) => !PROFILE_KEYS.has(key));
  if (unknownKeys.length > 0) {
    throw new Error(`fixture profile ${name} has unsupported keys: ${unknownKeys.join(', ')}`);
  }
  if (typeof profile.workload !== 'string' || profile.workload.length === 0) {
    throw new Error(`fixture profile ${name} must define workload`);
  }
  if (!isRecord(profile.k6_env)) {
    throw new Error(`fixture profile ${name} must define k6_env`);
  }
  for (const [key, value] of Object.entries(profile.k6_env)) {
    if (!K6_ENV_KEYS.has(key)) {
      throw new Error(`fixture profile ${name} has unsupported k6 env ${key}`);
    }
    if (typeof value !== 'string') {
      throw new Error(`fixture profile ${name} k6 env ${key} must be a string`);
    }
  }
};

const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
