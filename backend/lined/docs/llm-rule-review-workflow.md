# LLM Rule Review Workflow

This guide describes the review and promotion workflow for
`experiment/llm-rule-review-workflow`.

The workflow is additive. It keeps `candidate-rule-suggestions.json` as the
raw advisory artifact, adds a separate reviewed artifact with validation and
decision provenance, and emits a separate promoted fitness-configuration
artifact. It does not change backend behavior, collector score semantics, or
turn LLM support into a blocking experiment gate.

## Scope

This task provides:

- a manual Node CLI for reviewing candidate rules from the LLM support helper;
- deterministic candidate IDs so reviewer decisions can be traced across runs;
- a reviewed artifact with classification, validation, reviewer decision, and
  promotion eligibility per rule;
- a promoted configuration artifact that contains only approved rules plus
  provenance;
- documentation for the human-review boundary and required evidence.

This task does not:

- make LLM output a CI gate;
- auto-promote rules into runtime-aware, adaptive, or Pareto scoring;
- change `fitnessScore`, `runtimeFitnessScore`, `adaptiveFitnessScore`,
  `paretoOptimization`, or `decisionUsefulness`;
- replace the later checklist and guardrail tasks.

## Inputs

Run the workflow from the backend checkout root:

```bash
node load-tests/runtime-scenarios/llm-rule-review-workflow-cli.mjs \
  --advisory-json /absolute/path/candidate-rule-suggestions.json \
  --review-input-json /absolute/path/review-input.json \
  --output-dir /absolute/path/llm-rule-review-output
```

`--advisory-json` must point to the raw advisory output from
`llm-support-service-cli.mjs`. `--review-input-json` is a manual reviewer input
file that records reviewer identity, optional advisory-run metadata, and one
decision entry per candidate rule.

## Review Input Contract

The review input is intentionally explicit:

```json
{
  "reviewer": {
    "name": "Research Reviewer",
    "role": "architect"
  },
  "reviewed_at": "2026-06-13T11:00:00.000Z",
  "advisory_metadata": {
    "prompt_version": "llm-support-service-prototype-v1-prompt",
    "retrieved_sources": [
      "docs/llm-support-service.md",
      "load-tests/runtime-scenarios/slo-thresholds-v1.json"
    ],
    "latency_ms": 812,
    "cost_usd": 0.03,
    "failure_mode": ""
  },
  "decisions": [
    {
      "candidate_id": "latency-p95-local-123456abcdef",
      "validated_classification": "objective-with-constraint",
      "decision": "promote",
      "rationale": "Backed by explicit runtime evidence and review.",
      "reason_codes": [
        "source-backed",
        "telemetry-linked"
      ],
      "referenced_source_artifacts": [
        "/absolute/path/runtime-summary.json",
        "/absolute/path/requirements.md"
      ],
      "validation": {
        "measurable": true,
        "telemetry_linked": true,
        "threshold_basis": "source-backed",
        "duplicate_conflict_status": "unique",
        "evidence_status": "sufficient"
      }
    }
  ]
}
```

Supported review decisions are `promote`, `hold`, and `reject`.

Supported validation values are:

| Field | Allowed values |
|-------|----------------|
| `threshold_basis` | `source-backed`, `empirical`, `initial-assumption`, `not-applicable` |
| `duplicate_conflict_status` | `unique`, `duplicates-existing-rule`, `duplicates-candidate`, `conflicts-existing-rule` |
| `evidence_status` | `sufficient`, `partial`, `missing` |

## Validation Rules

Before a candidate rule can be promoted:

1. Confirm the rule is measurable from the current telemetry pipeline or
   runtime-summary contract.
2. Confirm the rule is linked to explicit runtime evidence or other declared
   source artifacts.
3. Confirm the classification used in review matches the intended role:
   objective, hard constraint, warning, context signal, or validation evidence.
4. Confirm the threshold basis is source-backed, empirically calibrated, or
   explicitly marked as an initial assumption.
5. Confirm the rule is unique and does not silently duplicate or conflict with
   an existing accepted rule.
6. Record reviewer identity, rationale, reason codes, and referenced source
   artifacts.

Supported validated classifications are `objective`,
`objective-with-constraint`, `hard-constraint`, `warning`, `context-signal`,
`validation-evidence`, and `exploratory`.

Promotion eligibility is true only when the reviewer decision is `promote`,
the rule is measurable, telemetry-linked, evidence is `sufficient`, and the
duplicate/conflict outcome is `unique`.

## Outputs

The output directory contains:

| File | Purpose |
|------|---------|
| `reviewed-candidate-rules.json` | Reviewed artifact with candidate IDs, advisory-run metadata, reviewer decision, validation state, reason codes, and promotion eligibility. |
| `promoted-fitness-config-v1.json` | Versioned promoted configuration containing only approved and promotion-eligible rules plus provenance. |

`promoted-fitness-config-v1.json` is an emitted artifact only. In this task,
no collector or scoring path reads it automatically.

## How To Use And Test

Generate the raw advisory artifact first with `llm-support-service-cli.mjs`.
Prepare a manual `review-input.json` that covers every candidate rule in the
advisory output. Then run `llm-rule-review-workflow-cli.mjs` with the advisory
artifact, review input, and an output directory. Inspect
`reviewed-candidate-rules.json` to confirm candidate IDs, advisory metadata,
referenced source artifacts, reviewer identity, and promotion-eligibility
flags are correct. Inspect `promoted-fitness-config-v1.json` to confirm only
approved and eligible rules were carried forward and that the output states
explicitly that scoring does not consume it automatically in this task.

## Article Use

Use this workflow when describing the human-review boundary for LLM-assisted
rule synthesis:

- Method: candidate rules are generated from bounded artifacts, then reviewed
  against measurable evidence before promotion.
- Experiment Design: accepted rules remain versioned and traceable to specific
  runtime and requirement artifacts.
- Discussion: AI assistance remains advisory and reviewable rather than an
  architecture-quality judge.
- Threats to Validity: rejected or held rules show where evidence, telemetry
  linkage, or threshold rationale was incomplete.

## Validation

Run focused checks for the workflow tooling:

```bash
node --check load-tests/runtime-scenarios/llm-rule-review-workflow.mjs
node --check load-tests/runtime-scenarios/llm-rule-review-workflow-cli.mjs
node --test load-tests/runtime-scenarios/llm-rule-review-workflow.test.mjs \
  load-tests/runtime-scenarios/llm-support-service.test.mjs
git diff --check
```
