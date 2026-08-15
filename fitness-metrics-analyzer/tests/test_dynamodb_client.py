import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from dynamodb_client import fetch_experiments, fetch_main_snapshots, flatten_metrics_document


class FakeTable:
    def __init__(self, pages):
        self.pages = list(pages)
        self.calls = []

    def scan(self, **kwargs):
        self.calls.append(kwargs)
        return self.pages.pop(0)


def document(branch, commit_hash, timestamp, fitness_score):
    return {
        "branch": branch,
        "commitHash": commit_hash,
        "timestamp": timestamp,
        "fitnessScore": fitness_score,
        "pullRequestId": "42",
        "metrics": {
            "jacoco_line_coverage": 83.1,
            "spotbugs_total": 1,
            "checkstyle_violations": 0,
            "sonar_cloud_main_branch_metrics": {"critical_violations": "0"},
            "sonar_cloud_current_branch_metrics": {"alert_status": "OK"},
        },
    }


class DynamoDbClientTest(unittest.TestCase):
    def test_fetch_experiments_paginates_and_excludes_main(self):
        table = FakeTable([
            {
                "Items": [
                    document("main", "a", "2026-08-01T00:00:00.000Z", 0.1),
                    document("experiment/improve-store", "b", "2026-08-02T00:00:00.000Z", 0.2),
                ],
                "LastEvaluatedKey": {"branch": "experiment/improve-store", "commitHash": "b"},
            },
            {"Items": [document("experiment/neutral-store", "c", "2026-08-03T00:00:00.000Z", 0.0)]},
        ])

        items = fetch_experiments(table=table)

        self.assertEqual([item["branch"] for item in items], [
            "experiment/improve-store",
            "experiment/neutral-store",
        ])
        self.assertEqual(table.calls[1], {
            "ExclusiveStartKey": {"branch": "experiment/improve-store", "commitHash": "b"},
        })
        self.assertEqual(items[0]["jacoco_line_coverage"], 83.1)
        self.assertEqual(items[0]["sonar_cloud_current_branch_metrics"]["alert_status"], "OK")

    def test_fetch_main_snapshots_sorts_normalized_documents(self):
        table = FakeTable([{
            "Items": [
                document("main", "b", "2026-08-02T00:00:00.000Z", 0.2),
                document("main", "a", "2026-08-01T00:00:00.000Z", 0.1),
            ],
        }])

        items = fetch_main_snapshots(table=table)

        self.assertEqual([item["fitnessScore"] for item in items], [0.1, 0.2])

    def test_flatten_metrics_document_keeps_analyzer_contract(self):
        item = flatten_metrics_document(
            document("experiment/degrade-store", "a", "2026-08-01T00:00:00.000Z", -0.2)
        )

        self.assertEqual(item["branch"], "experiment/degrade-store")
        self.assertEqual(item["spotbugs_total"], 1)
        self.assertEqual(item["pullRequestId"], "42")


if __name__ == "__main__":
    unittest.main()
