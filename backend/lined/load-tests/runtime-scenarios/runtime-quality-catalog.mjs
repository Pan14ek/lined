import fs from 'node:fs';
import path from 'node:path';

export const RUNTIME_QUALITY_CATALOG_PATH = 'load-tests/runtime-scenarios/runtime-quality-scenarios-v1.json';

export const loadRuntimeQualityCatalog = (
  { cwd = process.cwd(), file = RUNTIME_QUALITY_CATALOG_PATH } = {}
) => {
  const artifactPath = path.resolve(cwd, file);
  const parsed = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'));
  if (!isRecord(parsed) || parsed.schema_version !== 1 || !Array.isArray(parsed.scenarios)) {
    throw new Error('runtime quality catalog must contain schema_version 1 and scenarios');
  }
  return parsed;
};

export const matchRuntimeQualityScenarios = (
  { scenario, workload },
  options = {}
) => {
  const catalog = loadRuntimeQualityCatalog(options);
  return catalog.scenarios
    .filter((entry) => Array.isArray(entry.related_deployment_scenarios)
      && entry.related_deployment_scenarios.includes(scenario)
      && Array.isArray(entry.related_workload_profiles)
      && entry.related_workload_profiles.includes(workload))
    .map((entry) => ({
      evidence_kind: entry.evidence_kind,
      id: entry.id,
      kpi: entry.kpi,
      slo_or_constraint_roles: entry.slo_or_constraint_roles,
      supported_runtime_summary_fields: entry.supported_runtime_summary_fields,
    }));
};

const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
