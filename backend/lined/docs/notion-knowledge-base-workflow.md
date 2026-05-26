# Notion Knowledge Base Workflow

This guide defines how agents should use Notion as the durable knowledge base
for Lined backend research and experiment work.

Local backend docs remain the routing and fallback layer. Durable research
knowledge, experiment findings, artifact analysis, decisions, limitations, and
open questions should be written to the relevant Notion page when Notion is
available.

## When To Use This

Use this workflow when a task produces reusable knowledge about:

- scientific experiment design;
- backend implementation status for the article;
- Kubernetes, telemetry, load testing, or fitness-model work;
- artifact analysis from code, logs, reports, datasets, screenshots, or docs;
- research decisions, limitations, open questions, or next actions.

Do not use Notion write-back for ordinary code-only changes that do not change
durable research knowledge. In that case, keep the change documented in the PR
and repository docs as usual.

## Retrieval Order

1. Read `AGENTS.md` and `docs/README.md`.
2. Choose the relevant backend document from the docs index.
3. Open the matching Notion knowledge-base page when the task affects durable
   research context.
4. Use web search only when Notion lacks the answer, a source must be verified,
   or new official documentation/literature is required.
5. Distinguish source-backed facts from agent synthesis.

## Placement Rules

Use the smallest Notion update that keeps future agents oriented.

| Situation | Notion action |
| --- | --- |
| Current article or research state changes | Update the article knowledge hub. |
| Experiment metrics, baselines, scenarios, or implementation status changes | Update the experiment design and fitness model page. |
| External source, literature, or official documentation is added | Update the documentation/source routing page. |
| Workflow, routing, or agent behavior changes | Update the research workflow page. |
| No existing page fits the information | Create a child page under the knowledge-base root and add it to the root page index. |

## Write-Back Checklist

Before ending a research or experiment-analysis task, confirm whether durable
knowledge changed. If it did, write a Notion entry with:

- artifact or task name;
- artifact type;
- source path, URL, branch, PR, or command context;
- date analyzed;
- short summary;
- detailed analysis;
- key facts or extracted claims;
- research relevance;
- possible article or experiment use;
- limitations and uncertainty;
- open questions;
- next actions.

Use the bilingual block pattern when the text may be reused in the article:

```markdown
## UA working notes

...

## EN paper-ready formulation

...
```

## Verification After Write

After creating or updating a Notion page:

1. Fetch the page again through the Notion tool.
2. Confirm that the new section, table row, or page link is present.
3. If a new child page was created, confirm that the root knowledge-base index
   links to it with `Description` and `When to use`.
4. Report the updated Notion page title and URL in the final handoff.

The task is not complete until the Notion write-back is verified or a blocker
is reported.

## Fallback Policy

If Notion is unavailable:

1. Continue the analysis locally.
2. Add the temporary durable content to the most relevant file under `docs/`
   only when it is needed for handoff.
3. Mark the content as pending Notion sync.
4. In the final handoff, report the intended Notion page and the exact content
   that still needs to be synced.

Do not pretend that a Notion write-back happened when only local docs were
updated.

## Entry Template

```markdown
# <Clear section title> - <YYYY-MM-DD>

## UA working notes

Artifact name:
Artifact type:
Source:
Date analyzed:

Short summary:

Detailed analysis:

Key facts:

Research relevance:

Possible article or experiment use:

Limitations and uncertainty:

Open questions:

Next actions:

## EN paper-ready formulation

...
```

## Local Documentation Policy

Update repository docs when the change affects:

- agent routing;
- experiment workflow;
- commands or verification steps;
- source maps;
- durable backend experiment status.

Otherwise, keep local docs stable and store research synthesis in Notion.
