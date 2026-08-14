"""DynamoDB access and document normalization for pipeline-run analysis."""

import os
from typing import Any, Dict, Iterable, List, Optional

import boto3


def get_table(
    table_name: Optional[str] = None,
    region: Optional[str] = None,
):
    """Return the configured pipeline-runs DynamoDB table."""
    resolved_table_name = table_name or os.environ.get("AWS_METRICS_TABLE_NAME")
    resolved_region = region or os.environ.get("AWS_METRICS_REGION")
    if not resolved_table_name or not resolved_region:
        raise ValueError(
            "DynamoDB configuration not provided. Set AWS_METRICS_TABLE_NAME and "
            "AWS_METRICS_REGION, or pass both arguments."
        )
    return boto3.resource("dynamodb", region_name=resolved_region).Table(resolved_table_name)


def flatten_metrics_document(document: Dict[str, Any]) -> Dict[str, Any]:
    """Flatten a collector document without changing the analyzer data contract."""
    metrics = document.get("metrics") or {}
    return {
        "branch": document.get("branch"),
        "pullRequestId": document.get("pullRequestId"),
        "fitnessScore": document.get("fitnessScore"),
        "timestamp": document.get("timestamp"),
        "jacoco_line_coverage": metrics.get("jacoco_line_coverage"),
        "spotbugs_total": metrics.get("spotbugs_total"),
        "checkstyle_violations": metrics.get("checkstyle_violations"),
        "sonar_cloud_main_branch_metrics": metrics.get("sonar_cloud_main_branch_metrics"),
        "sonar_cloud_current_branch_metrics": metrics.get("sonar_cloud_current_branch_metrics"),
    }


def _scan_all(table) -> Iterable[Dict[str, Any]]:
    """Yield every item from the small research table through DynamoDB pagination."""
    request: Dict[str, Any] = {}
    while True:
        response = table.scan(**request)
        yield from response.get("Items", [])
        last_evaluated_key = response.get("LastEvaluatedKey")
        if not last_evaluated_key:
            return
        request["ExclusiveStartKey"] = last_evaluated_key


def fetch_experiments(
    table=None,
    table_name: Optional[str] = None,
    region: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Fetch all non-main branch pipeline runs from DynamoDB."""
    resolved_table = table or get_table(table_name, region)
    return [
        flatten_metrics_document(document)
        for document in _scan_all(resolved_table)
        if document.get("branch") != "main"
    ]


def fetch_main_snapshots(
    table=None,
    table_name: Optional[str] = None,
    region: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Fetch main-branch snapshots from DynamoDB in timestamp order."""
    resolved_table = table or get_table(table_name, region)
    snapshots = [
        flatten_metrics_document(document)
        for document in _scan_all(resolved_table)
        if document.get("branch") == "main"
    ]
    return sorted(snapshots, key=lambda item: item.get("timestamp") or "")
