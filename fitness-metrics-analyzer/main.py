"""
fitness-metrics-analyzer
========================
Fetches experiment data from Azure Cosmos DB and generates
analysis charts for the fitness function research paper.

Usage:
    python main.py --connection-string "AccountEndpoint=..."
    python main.py  # uses COSMOS_DB_CONNECTION_STRING env variable

Output:
    Charts are saved to the ./output/ directory.
"""

import argparse
import sys
import matplotlib
matplotlib.use("Agg")

from cosmos_client import fetch_experiments
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
        description="Fetch and analyze fitness function experiment data from Cosmos DB."
    )
    parser.add_argument(
        "--connection-string", "-c",
        type=str,
        default=None,
        help="Azure Cosmos DB connection string. Defaults to COSMOS_DB_CONNECTION_STRING env variable.",
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

    print("Connecting to Cosmos DB...")
    try:
        items = fetch_experiments(args.connection_string)
    except ValueError as e:
        print(f"Error: {e}")
        sys.exit(1)

    if not items:
        print("No experiment data found in Cosmos DB.")
        sys.exit(0)

    print(f"Fetched {len(items)} experiment run(s).")
    df = build_dataframe(items)

    # Remove non-experiment branches
    df = df[df["category"] != "other"].reset_index(drop=True)

    # Keep only experiment branches (exclude feature branches)
    df = df[df["branch"].str.startswith("experiment")].reset_index(drop=True)

    # Keep only the last run per branch (handles re-runs)
    df = df.sort_values("timestamp").drop_duplicates(subset="branch", keep="last")
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