# LLM Guardrail Evaluation

This guide describes the guardrail workflow for
`experiment/llm-guardrail-evaluation`.

The workflow is additive. It does not change backend behavior, collector
semantics, or existing scoring logic. Instead, it evaluates whether the
reviewed LLM artifact chain is safe to treat as promotion-ready evidence or
article-claim-ready evidence inside the repository workflow.

## Scope

This task provides:

- a deterministic Node CLI for enforcing two repo-local guardrail lanes:
  `promotion` and `article-claim`;
- a versioned `llm-guardrail-report.json` artifact that records lane verdicts,
  cross-artifact findings, and repo-local consumer-scan findings;
- explicit blocking behavior through CLI exit status when the requested lane is
  not safe to use.

This task does not:

- make LLM output a CI gate by itself;
- cause runtime-aware, adaptive, or Pareto scoring to consume advisory artifacts
  automatically;
- replace the reviewed artifact, checklist report, or reviewed explanation
  artifact;
- claim anything beyond repo-local consumer inspection.

## Inputs

Run the workflow from the backend checkout root:

```bash
node load-tests/runtime-scenarios/llm-guardrail-evaluation-cli.mjs \
  --lane all \
  --advisory-json /absolute/path/candidate-rule-suggestions.json \
  --reviewed-json /absolute/path/reviewed-candidate-rules.json \
  --promoted-json /absolute/path/promoted-fitness-config-v1.json \
  --checklist-json /absolute/path/llm-rule-validation-report.json \
  --results-report-json /absolute/path/results-report.json \
  --reviewed-explanations-json /absolute/path/reviewed-tradeoff-explanations.json \
  --output-dir /absolute/path/llm-guardrail-output
```

Use `--lane promotion` when you only need rule-promotion enforcement. Use
`--lane article-claim` when you only need article-facing explanation
enforcement. The promotion lane derives advisory candidate IDs using the same
deterministic rule identity logic as `llm-rule-review-workflow.mjs`, so the
advisory artifact schema stays unchanged.

## Promotion Lane

The `promotion` lane evaluates the reviewed rule artifact chain:

- `candidate-rule-suggestions.json`
- `reviewed-candidate-rules.json`
- `promoted-fitness-config-v1.json`
- `llm-rule-validation-report.json`

The lane passes only when:

1. The advisory artifact keeps the advisory-only and human-approval boundary
   explicit.
2. The promoted-config artifact keeps the emitted-only, non-auto-consumption
   policy explicit.
3. Every promoted rule maps to exactly one reviewed rule with
   `promotion_eligible === true`.
4. Every promoted rule maps to exactly one checklist `promotion_candidates`
   entry.
5. There are no stale candidate IDs, extras, or omissions across promoted,
   reviewed-eligible, and checklist-promotion-ready sets.
6. The promoted rules stay in explicit objective / constraint / context lanes.
7. A bounded repo-local consumer scan finds no references to these advisory
   artifacts outside the allowed `llm-*` workflow implementation surfaces.

The consumer scan is intentionally narrow. It can prove only that the current
repository does not appear to consume these artifacts as scoring or CI inputs
outside the allowed workflow surfaces. It does not claim anything about systems
outside this repository. When the backend checkout sits inside the Lined
monorepo, the scan also inspects the sibling `fitness-metrics-collector/` and
`fitness-metrics-analyzer/` scoring/reporting projects.

## Article-Claim Lane

The `article-claim` lane evaluates:

- `results-report.json`
- `reviewed-tradeoff-explanations.json`

The lane evaluates every reviewed explanation in the artifact. It passes only
when:

1. The explanation workflow remains rooted in the supplied `results-report.json`
   boundary.
2. Every reviewed explanation has `review.status === accepted`.
3. Every reviewed explanation has `review.article_readiness` equal to `ready`
   or `limitations-required`.
4. Every reviewed explanation preserves `requires_human_review: true`.
5. Every reviewed explanation keeps its referenced source artifacts inside the
   `results-report.json` boundary and the explicit evidence references already
   carried by the explanation draft.

Any `revise`, `rejected`, or `not-ready` explanation blocks the lane.

## Output Contract

The CLI writes `llm-guardrail-report.json` with:

- the requested lane;
- per-lane pass/fail verdicts;
- promotion-rule summaries;
- article-explanation summaries;
- repo-local consumer-scan findings;
- a list of blocking findings for any failed lane.

The CLI exits `0` only when the requested lane passes. It exits non-zero when
the requested lane is blocked or when the CLI input is invalid.

## How To Use And Test

Generate the upstream reviewed artifacts first:

1. `candidate-rule-suggestions.json` from `llm-support-service-cli.mjs`
2. `reviewed-candidate-rules.json` and `promoted-fitness-config-v1.json` from
   `llm-rule-review-workflow-cli.mjs`
3. `llm-rule-validation-report.json` from
   `llm-rule-validation-checklist-cli.mjs`
4. `reviewed-tradeoff-explanations.json` from
   `llm-tradeoff-explanations-cli.mjs`

Then run the guardrail CLI for the required lane. Inspect
`llm-guardrail-report.json` to see whether the artifact chain is blocked by
cross-artifact mismatches, missing approval states, source-boundary drift, or
repo-local consumer references. The article-claim lane evaluates
`reviewed-tradeoff-explanations.json`; it does not modify the advisory support
artifact, which may still carry `tradeoff_explanations` as raw helper output.

## Article Use

Use this workflow when describing how LLM-assisted rule suggestions and trade-
off explanations remain bounded:

- Method: reviewed rules and reviewed explanations still pass through explicit
  guardrails before they can be treated as promotion-ready or article-claim-
  ready inside the repo workflow.
- Experiment Design: the repository now distinguishes raw suggestions, reviewed
  rules, checklist validation, reviewed explanations, and final guardrail
  enforcement as separate stages.
- Threats to Validity: guardrail failures make silent promotion drift,
  incomplete approval, and boundary leakage visible instead of letting them
  appear safe by convention alone.

## Validation

Run focused checks for the guardrail tooling:

```bash
node --check load-tests/runtime-scenarios/llm-guardrail-evaluation.mjs
node --check load-tests/runtime-scenarios/llm-guardrail-evaluation-cli.mjs
node --test load-tests/runtime-scenarios/llm-guardrail-evaluation.test.mjs \
  load-tests/runtime-scenarios/llm-rule-review-workflow.test.mjs \
  load-tests/runtime-scenarios/llm-rule-validation-checklist.test.mjs \
  load-tests/runtime-scenarios/llm-tradeoff-explanations.test.mjs
git diff --check
```
