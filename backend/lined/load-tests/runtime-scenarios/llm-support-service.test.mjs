import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  buildLlmSupportAdvisory,
  buildOpenAiRequest,
  extractOpenAiOutputText,
  parseSupportArgs,
  writeLlmSupportAdvisory,
} from './llm-support-service.mjs';

const runtimeSummary = (scenario, overrides = {}) => ({
  schema_version: 1,
  scenario,
  workload: 'baseline',
  source: 'local-kind',
  summary: {
    latency_p95_ms: 240,
    latency_p99_ms: 480,
    error_rate: 0.002,
    throughput_rps: 41,
    restart_count: 0,
    cpu_utilization: 0.52,
    memory_utilization: 0.61,
    ...overrides.summary,
  },
  missing: overrides.missing ?? ['availability'],
});

const sloThresholds = {
  schema_version: 1,
  threshold_version: 'slo-thresholds-v1',
  thresholds: [{
    id: 'latency-p95-local',
    metric: 'latency_p95_ms',
    operator: '<=',
    value: 1000,
    severity: 'invalid',
    source: 'existing-k6-guardrail',
    rationale: 'Keeps baseline latency bounded.',
  }, {
    id: 'readiness-local',
    evidence_source: 'readiness_probe_or_actuator_health',
    operator: '==',
    value: true,
    severity: 'invalid',
    source: 'local-experiment-assumption',
    rationale: 'Ensure the workload targets a ready backend.',
  }, {
    id: 'cpu-pressure-local',
    metric: 'cpu_utilization',
    operator: '>',
    value: 0.85,
    severity: 'warning',
    source: 'future-calibration-needed',
    rationale: 'High CPU can explain scalability pressure.',
  }],
  context_metrics: [{
    metric: 'throughput_rps',
    reason: 'Use throughput as a comparison objective.',
  }],
};

const scenarioCatalog = {
  scenarios: [{
    id: 'stable-baseline-latency',
    slo_or_constraint_roles: ['hard-constraint', 'objective'],
    supported_runtime_summary_fields: ['latency_p95_ms', 'latency_p99_ms', 'throughput_rps'],
  }],
};

describe('parseSupportArgs', () => {
  it('accepts repeated requirements and runtime inputs', (t) => {
    t.plan(5);
    const options = parseSupportArgs([
      '--requirements-md',
      'requirements.md',
      '--requirements-md',
      'adr.md',
      '--runtime-summary',
      'runtime-a.json',
      '--runtime-summary',
      'runtime-b.json',
      '--slo-json',
      'slo.json',
      '--scenario-catalog-json',
      'catalog.json',
      '--provider',
      'openai',
      '--model',
      'gpt-5.5',
      '--output-dir',
      'out',
    ]);

    t.assert.deepEqual(options.requirementsMd, ['requirements.md', 'adr.md']);
    t.assert.deepEqual(options.runtimeSummary, ['runtime-a.json', 'runtime-b.json']);
    t.assert.equal(options.sloJson, 'slo.json');
    t.assert.equal(options.provider, 'openai');
    t.assert.equal(options.outputDir, 'out');
  });

  it('rejects missing required inputs', (t) => {
    t.plan(2);
    t.assert.throws(
      () => parseSupportArgs(['--requirements-md', 'requirements.md', '--slo-json', 'slo.json', '--output-dir', 'out']),
      /At least one --runtime-summary input is required/
    );
    t.assert.throws(
      () => parseSupportArgs(['--requirements-md', 'requirements.md', '--runtime-summary', 'runtime.json', '--output-dir', 'out']),
      /--slo-json is required/
    );
  });
});

describe('buildLlmSupportAdvisory', () => {
  it('builds deterministic advisory output for mock provider', async (t) => {
    t.plan(10);
    const advisory = await buildLlmSupportAdvisory({
      model: 'ignored',
      provider: 'mock',
      requirements: [{
        sourcePath: 'requirements.md',
        value: '# Requirements\nLatency and throughput must stay stable while scalability is reviewed.',
      }],
      runtimeSummaries: [{
        sourcePath: 'fixed-medium.json',
        value: runtimeSummary('fixed-medium'),
      }, {
        sourcePath: 'replicas-2.json',
        value: runtimeSummary('replicas-2', {
          summary: {
            throughput_rps: 49,
          },
        }),
      }],
      scenarioCatalog: {
        sourcePath: 'catalog.json',
        value: scenarioCatalog,
      },
      sloThresholds: {
        sourcePath: 'slo.json',
        value: sloThresholds,
      },
    });

    t.assert.equal(advisory.schema_version, 1);
    t.assert.equal(advisory.prototype_version, 'llm-support-service-prototype-v1');
    t.assert.equal(advisory.provider, 'mock');
    t.assert.equal(advisory.source_artifacts.length, 5);
    t.assert.equal(advisory.candidate_rules.length, 4);
    t.assert.equal(advisory.candidate_rules[0].classification, 'objective-with-constraint');
    t.assert.equal(advisory.candidate_rules[1].classification, 'validation-evidence');
    t.assert.equal(advisory.candidate_rules[2].classification, 'warning');
    t.assert.equal(advisory.candidate_rules[3].classification, 'context-signal');
    t.assert.match(advisory.review_notes[2], /scalability/);
  });

  it('builds a Responses API request with text.format json schema', (t) => {
    t.plan(5);
    const request = buildOpenAiRequest({
      model: 'gpt-5.5',
      requirements: [{
        sourcePath: 'requirements.md',
        value: 'Latency is important.',
      }],
      runtimeSummaries: [{
        sourcePath: 'fixed-medium.json',
        value: runtimeSummary('fixed-medium'),
      }],
      sloThresholds: {
        sourcePath: 'slo.json',
        value: sloThresholds,
      },
      scenarioCatalog: undefined,
    });

    t.assert.equal(request.model, 'gpt-5.5');
    t.assert.equal(typeof request.input, 'string');
    t.assert.equal(request.text.format.type, 'json_schema');
    t.assert.equal(request.text.format.name, 'llm_support_advisory');
    t.assert.equal(request.text.format.strict, true);
  });

  it('parses output_text and falls back to output content text fragments', (t) => {
    t.plan(2);
    t.assert.equal(
      extractOpenAiOutputText({ output_text: '{"candidate_rules":[],"review_notes":[],"source_artifacts":[],"tradeoff_explanations":[]}' }),
      '{"candidate_rules":[],"review_notes":[],"source_artifacts":[],"tradeoff_explanations":[]}'
    );
    t.assert.equal(
      extractOpenAiOutputText({
        output: [{
          content: [{
            text: '{"candidate_rules":[],"review_notes":[],"source_artifacts":[],"tradeoff_explanations":[]}',
          }],
        }],
      }),
      '{"candidate_rules":[],"review_notes":[],"source_artifacts":[],"tradeoff_explanations":[]}'
    );
  });
});

describe('writeLlmSupportAdvisory', () => {
  it('writes a versioned advisory document to the requested output directory', async (t) => {
    t.plan(4);
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'llm-support-'));
    const requirementsPath = path.join(tempDir, 'requirements.md');
    const runtimePath = path.join(tempDir, 'runtime-summary.json');
    const sloPath = path.join(tempDir, 'slo.json');
    const outputDir = path.join(tempDir, 'out');
    fs.writeFileSync(requirementsPath, '# Requirements\nLatency and reliability matter.\n', 'utf-8');
    fs.writeFileSync(runtimePath, JSON.stringify(runtimeSummary('fixed-medium'), null, 2), 'utf-8');
    fs.writeFileSync(sloPath, JSON.stringify(sloThresholds, null, 2), 'utf-8');

    const result = await writeLlmSupportAdvisory({
      model: 'gpt-5.5',
      outputDir,
      provider: 'mock',
      requirementsMd: [requirementsPath],
      runtimeSummary: [runtimePath],
      sloJson: sloPath,
    });

    t.assert.equal(path.basename(result.outputPath), 'candidate-rule-suggestions.json');
    t.assert.equal(fs.existsSync(result.outputPath), true);
    const written = JSON.parse(fs.readFileSync(result.outputPath, 'utf-8'));
    t.assert.equal(written.prototype_version, 'llm-support-service-prototype-v1');
    t.assert.equal(written.candidate_rules.length, 4);
  });
});
