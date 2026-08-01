# Agent Evaluation Harness

This guide describes the repo-local evaluation harness for
`experiment/agent-evaluation-harness`.

The harness is additive. It does not change backend behavior, scoring logic,
review workflows, or guardrail enforcement. It evaluates bounded agent outputs
against repeatable local cases so rule suggestions and research summaries can
be checked before they influence experiment work.

## Scope

This task provides:

- a deterministic Node CLI for evaluating one agent submission artifact against
  a versioned cases file;
- a new additive submission contract,
  `agent-evaluation-submission.json`, with two harness-local output types:
  `rule-suggestions` and `research-summary`;
- a versioned evaluation report, `agent-evaluation-report.json`, with explicit
  blocking and non-blocking findings plus pass/fail exit semantics;
- fixtureized local inputs that combine repo docs, sanitized Notion excerpts,
  runtime-summary fixtures, expected outputs, and review rubrics.

This task does not:

- fetch live Notion content during harness execution;
- prove retrieval routing or context-budget reporting;
- replace `candidate-rule-suggestions.json`,
  `reviewed-candidate-rules.json`,
  `tradeoff-explanation-drafts.json`,
  `reviewed-tradeoff-explanations.json`, or
  `llm-guardrail-report.json`;
- scan the repo for consumer references or enforce promotion/article guardrails.

`research-summary` is a harness-local evaluation category only. It is not an
alias for existing explanation or reporting artifact families.

## Inputs

Run the harness from the backend checkout root:

```bash
node load-tests/runtime-scenarios/agent-evaluation-harness-cli.mjs \
  --cases-json load-tests/runtime-scenarios/agent-evaluation-cases-v1.json \
  --submission-json /absolute/path/agent-evaluation-submission.json \
  --output-dir /absolute/path/agent-evaluation-output
```

The harness consumes:

- `agent-evaluation-cases-v1.json` for the versioned cases contract;
- repo-local fixture paths named in each case;
- one `agent-evaluation-submission.json` artifact produced by the evaluated
  agent workflow.

At evaluation time the harness checks that every case `sources[].path` exists
on disk and that each submission `loaded_sources[]` entry matches the case
contract by `source_id`, `kind`, and resolved path.

The harness must stay deterministic. Repo docs can be read directly from the
checkout, but Notion content is consumed only through fixtureized local
snapshots. Refresh those snapshots when the live Notion pages change and treat
the fixture set as stale after the configured `stale_after_days` window.

## Cases Contract

`agent-evaluation-cases-v1.json` defines:

- case id and title;
- output type: `rule-suggestions` or `research-summary`;
- allowed source set with stable `source_id` values;
- required loaded sources;
- expected phrases, source references, metrics, classifications, scenario
  scopes, per-rule tuples, limitations, next actions, and uncertainty cues;
- fixture refresh metadata.

Current v1 cases cover:

- rule-suggestion evaluation rooted in `docs/research/ai/llm-support-service.md`, a
  `Research Workflow for Agents` Notion snapshot, and a fixed-medium runtime
  summary fixture;
- research-summary evaluation rooted in
  `docs/research/platform/runtime-quality-scenario-catalog.md`, an `Experiment Design and
  Fitness Model` Notion snapshot, and the same runtime-summary fixture.

## Submission Contract

`agent-evaluation-submission.json` uses:

```json
{
  "schema_version": 1,
  "workflow_version": "agent-evaluation-submission-v1",
  "case_id": "rule-suggestions-fixed-medium-baseline",
  "output_type": "rule-suggestions",
  "loaded_sources": [
    {
      "source_id": "repo-llm-support-service",
      "kind": "repo-doc",
      "path": "docs/research/ai/llm-support-service.md"
    }
  ],
  "output": {}
}
```

For `rule-suggestions`, `output` contains:

- `summary`;
- `candidate_rules[]` with metric, classification, scenario scope, source
  references, and `requires_human_approval`.

For `research-summary`, `output` contains:

- `summary`;
- `key_claims[]`;
- `limitations[]`;
- `next_actions[]`;
- `referenced_source_ids[]`;
- `uncertainty_notes[]`.

## Report Contract

The harness writes `agent-evaluation-report.json` with:

- harness `schema_version` and `workflow_version`;
- evaluated case id/title/output type;
- fixture freshness metadata;
- per-check findings with `pass`, `warn`, or `fail`;
- explicit blocking and non-blocking counts;
- `overall_status` equal to `pass` or `fail`.

Exit semantics:

- `0`: all blocking checks passed; warnings may still be present;
- `1`: invalid input or one or more blocking findings failed.

## How To Use And Test

Prepare or export one `agent-evaluation-submission.json` for a supported v1
case. Run the CLI with the cases file, submission file, and output directory.
Inspect `agent-evaluation-report.json` to confirm:

- the submission stayed within the allowed source set;
- required metrics, classifications, claims, limitations, and next actions are
  present for the selected case;
- human-review and uncertainty cues remain explicit;
- the fixture set is not stale, or if stale, the warning is visible and the
  Notion snapshot refresh can be scheduled.

Run focused checks for the harness:

```bash
node --check load-tests/runtime-scenarios/agent-evaluation-harness.mjs
node --check load-tests/runtime-scenarios/agent-evaluation-harness-cli.mjs
node --test load-tests/runtime-scenarios/agent-evaluation-harness.test.mjs
git diff --check
```

## Notion Refresh And Write-Back

This task changes durable workflow knowledge and experiment-method status.
Before merge:

- update `Research Workflow for Agents` with the harness scope, local-fixture
  rule, report contract, and refresh expectations;
- update `Experiment Design and Fitness Model` with the new harness status and
  its role in bounded agent evaluation;
- refetch both updated pages and verify the new sections are present.

## Article Use

Use this harness when describing how agent assistance is evaluated before it is
trusted in experiment work:

- Method: agent outputs are checked against fixed cases, expected evidence, and
  review rubrics.
- Experiment Design: workflow knowledge is snapshot-based and reproducible
  rather than dependent on live retrieval during local verification.
- Threats to Validity: fixture drift remains possible, so Notion snapshots must
  be refreshed and marked stale when live knowledge changes.
