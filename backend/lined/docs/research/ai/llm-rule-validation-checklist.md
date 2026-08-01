# LLM Rule Validation Checklist

This guide describes the checklist workflow for
`experiment/llm-rule-validation-checklist`.

The checklist is additive. It reads the reviewed artifact from
`experiment/llm-rule-review-workflow`, evaluates each reviewed rule against the
required evidence checks, and emits a versioned validation report. It does not
change backend behavior, collector score semantics, or automatically promote
validated rules into scoring.

## Scope

This task provides:

- a manual Node CLI for evaluating reviewed LLM rule artifacts;
- a versioned checklist report over source evidence, telemetry linkage,
  classification, threshold rationale, and expert approval;
- a promotion-ready summary that identifies which reviewed rules satisfy the
  full checklist;
- documentation for the evidence-checking boundary between reviewed rules and
  later guardrail work.

This task does not:

- make LLM support a CI gate;
- replace the reviewed artifact or promoted configuration artifact;
- cause the collector or scoring paths to consume checklist results
  automatically;
- replace the later guardrail-evaluation task.

## Inputs

Run the workflow from the backend checkout root:

```bash
node load-tests/runtime-scenarios/llm-rule-validation-checklist-cli.mjs \
  --reviewed-json /absolute/path/reviewed-candidate-rules.json \
  --output-dir /absolute/path/llm-rule-validation-output
```

`--reviewed-json` must point to the reviewed artifact emitted by
`llm-rule-review-workflow-cli.mjs`.

## Checklist Rules

Each reviewed rule is checked for:

1. Source evidence: referenced source artifacts are present and the reviewed
   evidence status is not `missing`.
2. Telemetry linkage: the reviewed rule is explicitly linked to telemetry or
   runtime-summary evidence.
3. Role classification: the validated classification is explicit and supported
   (`objective`, `objective-with-constraint`, `hard-constraint`, `warning`,
   `context-signal`, `validation-evidence`, or `exploratory`).
4. Threshold rationale: reviewer rationale is present and the threshold basis
   is explicit. `initial-assumption` remains a warning rather than a full pass.
5. Expert approval: reviewer identity, reviewer role, reviewer timestamp,
   decision, and reason codes are all present.

The checklist report keeps three outcome levels:

| Status | Meaning |
|--------|---------|
| `pass` | The check is satisfied. |
| `warn` | The check is explicit but still provisional, for example an initial assumption. |
| `fail` | Required evidence or review state is missing. |

## Output Contract

The checklist CLI writes `llm-rule-validation-report.json` with:

- advisory-run metadata copied from the reviewed artifact;
- reviewer metadata;
- per-rule checklist results and overall status;
- a summary of pass, warn, fail, and promotion-ready counts;
- a `promotion_candidates` list for reviewed rules that were both marked
  `promote` and passed the full checklist.

The report is evidence only. It does not alter the reviewed artifact or the
promoted configuration artifact from the previous task.

## How To Use And Test

Generate `reviewed-candidate-rules.json` first with
`llm-rule-review-workflow-cli.mjs`. Then run
`llm-rule-validation-checklist-cli.mjs` against that reviewed artifact and an
output directory. Inspect `llm-rule-validation-report.json` to see which rules
fully passed, which remained provisional, and which failed the evidence
requirements. Use the report as the operator-facing checklist before a reviewed
rule is cited in article claims or carried forward into later guardrail work.
Run `docs/research/ai/llm-guardrail-evaluation.md` after this checklist when you need the
final repo-local guardrail enforcement step before treating reviewed rules as
promotion-ready or reviewed explanations as article-claim-ready.

## Article Use

Use this checklist when describing how LLM-assisted rule suggestions remain
evidence-checked:

- Method: reviewed rules are not enough on their own; they still pass through a
  structured evidence checklist.
- Experiment Design: rule promotion is traceable to source artifacts, telemetry
  linkage, threshold basis, and expert approval.
- Threats to Validity: warnings and failures identify provisional thresholds,
  incomplete evidence, or incomplete reviewer provenance.

## Validation

Run focused checks for the checklist tooling:

```bash
node --check load-tests/runtime-scenarios/llm-rule-validation-checklist.mjs
node --check load-tests/runtime-scenarios/llm-rule-validation-checklist-cli.mjs
node --test load-tests/runtime-scenarios/llm-rule-validation-checklist.test.mjs \
  load-tests/runtime-scenarios/llm-rule-review-workflow.test.mjs
git diff --check
```
