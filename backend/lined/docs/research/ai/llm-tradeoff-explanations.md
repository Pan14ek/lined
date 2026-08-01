# LLM Trade-off Explanations

This guide describes the reviewed explanation workflow for
`experiment/llm-tradeoff-explanations`.

The workflow is additive. It reads `results-report.json` from
`experiment/experiment-results-reporting`, generates explanation drafts that
stay tied to explicit Pareto and decision-usefulness evidence, and optionally
records reviewer decisions in a separate reviewed artifact. It does not change
backend behavior, collector score semantics, runtime-summary contracts, or
article truth automatically.

## Scope

This task provides:

- a dependency-free Node CLI for generating trade-off explanation drafts from
  `results-report.json`;
- deterministic explanation IDs tied to concrete comparison targets;
- an optional OpenAI-backed drafting mode that stays inside a strict JSON
  output contract;
- a separate reviewed artifact with reviewer status, rationale, and
  article-readiness metadata per explanation draft;
- explicit downgrade or refusal behavior when the report is incomplete or
  unsafe for trade-off claims.

This task does not:

- promote explanations into runtime-aware scoring, adaptive weighting, Pareto
  ranking, or guardrail rules;
- convert draft explanations into article claims automatically;
- infer missing runtime evidence or smooth away excluded evidence;
- replace the rule review or rule checklist workflows.

## Inputs

Run the workflow from the backend checkout root:

```bash
node load-tests/runtime-scenarios/llm-tradeoff-explanations-cli.mjs \
  --results-report-json /absolute/path/results-report.json \
  --review-input-json /absolute/path/explanation-review-input.json \
  --output-dir /absolute/path/llm-tradeoff-output
```

`--results-report-json` must point to the output of
`experiment-results-report-cli.mjs`. `--review-input-json` is optional, but it
is required when you want the separate reviewed artifact.

The workflow treats `results-report.json` as the article-evidence boundary. It
reads:

- `canonicalComparison` for comparison completeness;
- `tables.decisionUsefulness` for candidate-level or summary-level trade-off
  evidence;
- `tables.paretoCandidates` for Pareto rank and selected-candidate context;
- `limitations` for missing metrics, omitted objectives, and excluded evidence.

## Draft Output Contract

The draft artifact is `tradeoff-explanation-drafts.json`.

Each explanation draft includes:

- `explanation_id`: deterministic ID tied to the comparison target;
- `explanation_type`: `candidate-tradeoff` or `comparison-summary`;
- `candidate_id` and `fixed_scalar_top_candidate_id` when applicable;
- `title` and `summary`;
- `limitations`: explicit caveats that must remain visible;
- `evidence_refs`: concrete provenance anchors such as candidate IDs, scalar
  top IDs, Pareto rank references, and the source `results-report.json`;
- `requires_human_review: true`.

Drafts are generated only when the report is safe enough for explanation
generation. When the report is incomplete, the workflow emits zero drafts and
records blocking reasons in `review_notes`.

## Review Input Contract

When `--review-input-json` is supplied, it must contain:

```json
{
  "reviewer": {
    "name": "Research Reviewer",
    "role": "architect"
  },
  "reviewed_at": "2026-06-13T13:00:00.000Z",
  "decisions": [
    {
      "explanation_id": "replicas-2-fixed-medium-abcdef123456",
      "status": "accepted",
      "rationale": "Grounded in the decision-usefulness row and keeps the evidence boundary explicit.",
      "reason_codes": [
        "telemetry-linked",
        "pareto-traceable"
      ],
      "referenced_source_artifacts": [
        "/absolute/path/results-report.json"
      ],
      "article_readiness": "limitations-required"
    }
  ]
}
```

Supported review statuses are:

| Status | Meaning |
|--------|---------|
| `accepted` | Draft may be retained as reviewed explanation evidence. |
| `revise` | Draft is usable only after revision. |
| `rejected` | Draft should not be used as explanation evidence. |

Supported `article_readiness` values are:

| Value | Meaning |
|-------|---------|
| `ready` | Reviewer accepts the draft for article-facing use without extra caveats beyond the draft itself. |
| `limitations-required` | Reviewer accepts the draft only if the stated limitations stay attached. |
| `not-ready` | Reviewer does not consider the draft safe for article-facing use. |

Every decision must include non-empty `rationale`, `reason_codes`, and
`referenced_source_artifacts`. Those references must stay inside the explanation
artifact boundary: the source `results-report.json` path and the explicit
comparison anchors already carried by the draft.

## Downgrade And Refusal Rules

The workflow separates three readiness levels:

| Readiness | Meaning |
|-----------|---------|
| `ready` | The report has canonical comparison coverage and no reported exclusions or missing metrics that force extra caveats. |
| `limitations-required` | Drafts may be generated, but they must carry explicit caveats about missing metrics, omitted objectives, or excluded evidence. |
| `insufficient-evidence` | Draft generation is refused because the report is incomplete for safe trade-off claims. |

Draft generation is refused when:

- `canonicalComparison.status` is not `available`;
- `tables.decisionUsefulness` is missing or empty;
- a decision-usefulness candidate row has no matching Pareto row marked
  `selected: true`;
- no usable comparison targets exist in the decision-usefulness table.

Draft generation is downgraded to `limitations-required` when:

- `limitations.excludedEvidenceCount > 0`;
- runtime metrics remain missing;
- objectives were omitted from Pareto or scalar comparison reporting.

## Outputs

The output directory contains:

| File | Purpose |
|------|---------|
| `tradeoff-explanation-drafts.json` | Advisory explanation drafts tied to explicit comparison targets and limitations. |
| `reviewed-tradeoff-explanations.json` | Reviewed explanation artifact with reviewer status and article-readiness metadata. |

The reviewed artifact is written only when `--review-input-json` is supplied.

## How To Use And Test

First generate `results-report.json` with
`experiment-results-report-cli.mjs`. Review that report before drafting:
confirm the canonical comparison is available, inspect decision-usefulness
rows, and note any excluded evidence or missing metrics in the limitations
section. Then run `llm-tradeoff-explanations-cli.mjs` with the report and an
output directory. If you want a reviewed artifact, prepare a review-input JSON
that covers every draft explanation ID and rerun the CLI with
`--review-input-json`.

Inspect `tradeoff-explanation-drafts.json` to confirm each explanation is tied
to a concrete candidate or summary comparison target, that the fixed scalar top
candidate is named when relevant, and that limitations or exclusion reasons are
preserved instead of hidden. Inspect `reviewed-tradeoff-explanations.json` to
confirm reviewer identity, status, rationale, reason codes, referenced source
artifacts, and article-readiness values are complete.

## Article Use

Use this workflow when you need article-facing narrative drafts that accompany
numeric results:

- Results: connect Pareto and decision-usefulness rows to concrete scenario
  comparisons without changing the numbers.
- Discussion: explain why a Pareto alternative is actionable, or why the scalar
  top remains the only supported choice.
- Threats to Validity: preserve missing metrics, excluded evidence, and
  incomplete comparison coverage as explicit caveats.

These outputs remain reviewed explanation evidence, not scoring inputs and not
automatic article claims.

## Validation

Run focused checks for the explanation workflow:

```bash
node --check load-tests/runtime-scenarios/llm-tradeoff-explanations.mjs
node --check load-tests/runtime-scenarios/llm-tradeoff-explanations-cli.mjs
node --test load-tests/runtime-scenarios/llm-tradeoff-explanations.test.mjs
git diff --check
```
