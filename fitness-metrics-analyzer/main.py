"""
fitness-metrics-analyzer
========================
Fetches experiment data from Amazon DynamoDB and generates
analysis charts for the fitness function research paper.

Usage:
    python main.py --table-name pipeline-runs --region eu-north-1
    python main.py  # uses AWS_METRICS_TABLE_NAME and AWS_METRICS_REGION

Output:
    Charts are saved to the ./output/ directory.
"""

import argparse
import sys
import matplotlib
matplotlib.use("Agg")

from dynamodb_client import fetch_experiments
from data import build_dataframe
from statistics_analysis import print_full_report, export_stats_csv
from charts import (
    plot_f_scores_bar,
    plot_f_scores_by_category,
    plot_metric_comparison,
    plot_f_over_time,
    plot_qg_vs_f,
    plot_descriptive_stats_table,
    print_summary,
)


def parse_args():
    parser = argparse.ArgumentParser(
        description="Fetch and analyze fitness function experiment data from DynamoDB."
    )
    parser.add_argument(
        "--table-name",
        type=str,
        default=None,
        help="DynamoDB table name. Defaults to AWS_METRICS_TABLE_NAME.",
    )
    parser.add_argument(
        "--region",
        type=str,
        default=None,
        help="AWS region. Defaults to AWS_METRICS_REGION.",
    )
    parser.add_argument(
        "--no-save",
        action="store_true",
        help="Show charts interactively instead of saving to files.",
    )
    parser.add_argument(
        "--chart",
        type=str,
        choices=["bar", "category", "metrics", "timeline", "qg", "table", "all"],
        default="all",
        help="Which chart(s) to generate. Default: all.",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    save = not args.no_save

    print("Connecting to DynamoDB...")
    try:
        items = fetch_experiments(table_name=args.table_name, region=args.region)
    except ValueError as e:
        print(f"Error: {e}")
        sys.exit(1)

    if not items:
        print("No experiment data found in DynamoDB.")
        sys.exit(0)

    print(f"Fetched {len(items)} experiment run(s).")
    df = build_dataframe(items)

    # Remove non-experiment branches
    df = df[df["category"] != "other"].reset_index(drop=True)

    # Keep only experiment branches (exclude feature branches)
    df = df[df["branch"].str.startswith("experiment")].reset_index(drop=True)

    # Keep only the last run per branch (handles re-runs)
    # Keep only the last run per branch that has a valid fitness score
    df = df[df["fitness_score"].notna()]
    df = df.sort_values("timestamp", na_position="first").drop_duplicates(subset="branch", keep="last")
    df = df.sort_values("fitness_score", ascending=False).reset_index(drop=True)

    print(f"After deduplication: {len(df)} unique experiment(s).")

    print_summary(df)
    print_full_report(df)
    export_stats_csv(df)

    chart = args.chart
    if chart in ("bar", "all"):
        plot_f_scores_bar(df, save=save)
    if chart in ("category", "all"):
        plot_f_scores_by_category(df, save=save)
    if chart in ("metrics", "all"):
        plot_metric_comparison(df, save=save)
    if chart in ("timeline", "all"):
        plot_f_over_time(df, save=save)
    if chart in ("qg", "all"):
        plot_qg_vs_f(df, save=save)
    if chart in ("table", "all"):
        plot_descriptive_stats_table(df, save=save)

    if not save:
        import matplotlib.pyplot as plt
        plt.show()

    print("Done.")


if __name__ == "__main__":
    main()
