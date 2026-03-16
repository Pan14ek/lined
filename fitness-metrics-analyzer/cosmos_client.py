from azure.cosmos import CosmosClient
from typing import Optional, List
import os


def get_container(connection_string: Optional[str] = None):
    conn = connection_string or os.environ.get("COSMOS_DB_CONNECTION_STRING")
    if not conn:
        raise ValueError(
            "Cosmos DB connection string not provided. "
            "Pass it as an argument or set COSMOS_DB_CONNECTION_STRING env variable."
        )
    client = CosmosClient.from_connection_string(conn)
    return client.get_database_client("metrics").get_container_client("pipeline-runs")


def fetch_experiments(connection_string: Optional[str] = None) -> List[dict]:
    """Fetch all non-main branch pipeline runs from Cosmos DB."""
    container = get_container(connection_string)
    query = """
        SELECT
            c.branch,
            c.pullRequestId,
            c.fitnessScore,
            c.timestamp,
            c.metrics.jacoco_line_coverage,
            c.metrics.spotbugs_total,
            c.metrics.checkstyle_violations,
            c.metrics.sonar_cloud_main_branch_metrics,
            c.metrics.sonar_cloud_current_branch_metrics
        FROM c
        WHERE c.branch != 'main'
        ORDER BY c.timestamp ASC
    """
    items = list(container.query_items(query=query, enable_cross_partition_query=True))
    return items


def fetch_main_snapshots(connection_string: Optional[str] = None) -> List[dict]:
    """Fetch all main branch snapshots from Cosmos DB."""
    container = get_container(connection_string)
    query = """
        SELECT
            c.branch,
            c.timestamp,
            c.metrics.jacoco_line_coverage,
            c.metrics.spotbugs_total,
            c.metrics.checkstyle_violations
        FROM c
        WHERE c.branch = 'main'
        ORDER BY c.timestamp ASC
    """
    return list(container.query_items(query=query, enable_cross_partition_query=True))