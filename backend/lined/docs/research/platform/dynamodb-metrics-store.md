# DynamoDB Pipeline Metrics Store

`pipeline-runs` is the DynamoDB persistence layer for CI fitness documents.
It replaces Cosmos DB without changing the collector document contract. The
table begins a new collection period; historical Cosmos records are not copied.

## Data and indexes

The existing table is in `eu-north-1` with primary key `branch` (String) and
`commitHash` (String). The collector writes one immutable item per branch and
commit through a conditional put.

Create these provisioned `KEYS_ONLY` global secondary indexes, each with 1 RCU
and 1 WCU:

| Name | Partition key | Sort key | Purpose |
|---|---|---|---|
| `branch-timestamp-index` | `branch` | `timestamp` | Latest `main` structural baseline |
| `runtime-baseline-index` | `runtimeBaselineKey` | `timestamp` | Latest matching `main` runtime baseline |

`runtimeBaselineKey` is a JSON array of `main`, scenario, workload, and source.
It is only stored for main documents with runtime metrics, keeping the index
sparse. ISO-8601 UTC timestamps sort chronologically as strings.

## GitHub Actions OIDC setup

1. In IAM, reuse or create the `token.actions.githubusercontent.com` OIDC
   provider with audience `sts.amazonaws.com`.
2. Create the two roles with the trust and permissions files in
   [`dynamodb-metrics-store/policies`](dynamodb-metrics-store/policies/).
   Replace `<AWS_ACCOUNT_ID>` in trust policies and `<TABLE_ARN>` in permissions
   policies before applying them.
3. Configure these repository Actions secrets. The role ARNs, region, and table
   name are not credentials by themselves, but this repository intentionally
   keeps all AWS metrics configuration in the Actions secrets store. Secrets are
   unavailable to workflows triggered from forks; those fork PRs run without a
   DynamoDB baseline.

   | Secret | Value |
   |---|---|
   | `AWS_METRICS_REGION` | `eu-north-1` |
   | `AWS_METRICS_TABLE_NAME` | `pipeline-runs` |
   | `AWS_METRICS_PR_READ_ROLE_ARN` | ARN of the pull-request read role |
   | `AWS_METRICS_MAIN_WRITE_ROLE_ARN` | ARN of the main write role |

4. A pull request writes only a `metrics-document` artifact; CI sets
   `METRICS_PERSIST=false` for pull requests. The trusted `workflow_run`
   workflow downloads this data without checking out PR code, verifies its
   branch and commit against the triggering run, then persists it through the
   main write role. Verify it creates exactly one item for the PR commit.
   Merge it, then verify the `main` workflow creates exactly one item
   for its commit. Remove the obsolete `COSMOS_DB_CONNECTION_STRING` Actions
   secret only after that successful main run.

The trust policies use the repository's currently verified default OIDC subject
format. If GitHub OIDC immutable subjects are enabled later, update both policy
subjects before enabling the workflow.

## Local usage

The collector uses the standard AWS SDK credential chain. Set both variables to
persist locally; omit both to retain local-output-only operation. Set
`METRICS_PERSIST=false` when credentials should only read baselines.

```bash
export AWS_METRICS_REGION=eu-north-1
export AWS_METRICS_TABLE_NAME=pipeline-runs
npm run metrics
```
