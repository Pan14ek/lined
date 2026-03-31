import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np
import pandas as pd
from data import CATEGORY_COLORS, summary_stats

OUTPUT_DIR = "output"


def _ensure_output_dir():
    import os
    os.makedirs(OUTPUT_DIR, exist_ok=True)


def plot_f_scores_bar(df: pd.DataFrame, save: bool = True) -> plt.Figure:
    """Bar chart of F scores sorted descending, colored by category."""
    fig, ax = plt.subplots(figsize=(14, 5))

    bars = ax.bar(
        df["short_name"],
        df["fitness_score"],
        color=df["color"],
        edgecolor="none",
        width=0.6,
    )

    ax.axhline(0, color="black", linewidth=0.8, linestyle="--", alpha=0.5, label="F = 0")
    ax.set_ylabel("F score", fontsize=11)
    ax.set_title("Fitness function score by experiment", fontsize=13, pad=12)
    ax.set_ylim(-0.45, 0.7)
    plt.xticks(rotation=38, ha="right", fontsize=9)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.grid(axis="y", alpha=0.2)

    # Annotate bar values
    for bar, val in zip(bars, df["fitness_score"]):
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            val + (0.015 if val >= 0 else -0.025),
            f"{val:.3f}",
            ha="center", va="bottom" if val >= 0 else "top",
            fontsize=7.5, color="#444"
        )

    # Legend
    legend_handles = [
        mpatches.Patch(color=c, label=k)
        for k, c in CATEGORY_COLORS.items()
    ]
    ax.legend(handles=legend_handles, fontsize=9, framealpha=0.4, loc="upper right")

    plt.tight_layout()
    if save:
        _ensure_output_dir()
        fig.savefig(f"{OUTPUT_DIR}/f_scores_bar.png", dpi=150, bbox_inches="tight")
        print(f"Saved: {OUTPUT_DIR}/f_scores_bar.png")
    return fig


def plot_f_scores_by_category(df: pd.DataFrame, save: bool = True) -> plt.Figure:
    """Scatter plot of F scores grouped by category with jitter."""
    fig, ax = plt.subplots(figsize=(8, 5))

    cats = ["improvement", "feature", "degradation", "neutral"]
    rng = np.random.default_rng(42)

    for i, cat in enumerate(cats):
        subset = df[df["category"] == cat]
        jitter = rng.uniform(-0.12, 0.12, len(subset))
        ax.scatter(
            [i + j for j in jitter],
            subset["fitness_score"],
            color=CATEGORY_COLORS.get(cat, "#888"),
            s=90, zorder=3, alpha=0.85,
            label=cat,
        )
        # Mean line
        mean_val = subset["fitness_score"].mean()
        ax.plot([i - 0.25, i + 0.25], [mean_val, mean_val],
                color=CATEGORY_COLORS.get(cat, "#888"), linewidth=2, zorder=4)

    ax.axhline(0, color="black", linewidth=0.8, linestyle="--", alpha=0.4)
    ax.set_xticks(range(len(cats)))
    ax.set_xticklabels(cats, fontsize=11)
    ax.set_ylabel("F score", fontsize=11)
    ax.set_title("F score distribution by category\n(horizontal bar = mean)", fontsize=12)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.grid(axis="y", alpha=0.2)
    plt.tight_layout()

    if save:
        _ensure_output_dir()
        fig.savefig(f"{OUTPUT_DIR}/f_scores_by_category.png", dpi=150, bbox_inches="tight")
        print(f"Saved: {OUTPUT_DIR}/f_scores_by_category.png")
    return fig


def plot_metric_comparison(df: pd.DataFrame, save: bool = True) -> plt.Figure:
    """Compare individual metrics (SpotBugs, Checkstyle, JaCoCo) across experiments."""
    fig, axes = plt.subplots(1, 3, figsize=(15, 5))

    metrics = [
        ("jacoco_line_coverage",  "JaCoCo line coverage (%)", axes[0]),
        ("spotbugs_total",        "SpotBugs violations",       axes[1]),
        ("checkstyle_violations", "Checkstyle violations",     axes[2]),
    ]

    for col, title, ax in metrics:
        values = df[col].fillna(0)
        bars = ax.bar(df["short_name"], values, color=df["color"], edgecolor="none", width=0.6)
        ax.set_title(title, fontsize=10)
        ax.set_ylim(0, max(values.max() * 1.2, 1))
        plt.sca(ax)
        plt.xticks(rotation=40, ha="right", fontsize=7.5)
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)
        ax.grid(axis="y", alpha=0.2)

    fig.suptitle("Raw metrics by experiment", fontsize=13, y=1.02)
    plt.tight_layout()

    if save:
        _ensure_output_dir()
        fig.savefig(f"{OUTPUT_DIR}/raw_metrics.png", dpi=150, bbox_inches="tight")
        print(f"Saved: {OUTPUT_DIR}/raw_metrics.png")
    return fig


def plot_f_over_time(df: pd.DataFrame, save: bool = True) -> plt.Figure:
    """F score timeline ordered by timestamp."""
    df_time = df.dropna(subset=["timestamp"]).sort_values("timestamp")
    fig, ax = plt.subplots(figsize=(13, 4))

    ax.plot(df_time["short_name"], df_time["fitness_score"],
            color="#888", linewidth=1, linestyle="--", zorder=1)
    ax.scatter(df_time["short_name"], df_time["fitness_score"],
               color=df_time["color"], s=80, zorder=2)

    ax.axhline(0, color="black", linewidth=0.8, linestyle="--", alpha=0.4)
    ax.set_ylabel("F score", fontsize=11)
    ax.set_title("Fitness score over time (experiment order)", fontsize=12)
    plt.xticks(rotation=38, ha="right", fontsize=9)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.grid(axis="y", alpha=0.2)
    plt.tight_layout()

    if save:
        _ensure_output_dir()
        fig.savefig(f"{OUTPUT_DIR}/f_over_time.png", dpi=150, bbox_inches="tight")
        print(f"Saved: {OUTPUT_DIR}/f_over_time.png")
    return fig


def plot_qg_vs_f(df: pd.DataFrame, save: bool = True) -> plt.Figure:
    """Compare SonarQube Quality Gate binary result vs continuous F score."""
    fig, ax = plt.subplots(figsize=(13, 6))

    qg_numeric = df["sonarqube_qg"].map({"OK": 1, "ERROR": 0, "UNKNOWN": 0.5})

    rng = np.random.default_rng(42)
    jitter = rng.uniform(-0.06, 0.06, len(df))

    for i, (idx, row) in enumerate(df.iterrows()):
        y_pos = qg_numeric[idx] + jitter[i]
        ax.scatter(
            row["fitness_score"], y_pos,
            color=row["color"], s=110, zorder=3, alpha=0.85,
        )

    # Quadrant shading
    ax.axhspan(0.5, 1.3, xmin=0.5, alpha=0.06, color="#1D9E75")
    ax.axhspan(-0.3, 0.5, xmax=0.5, alpha=0.06, color="#E24B4A")

    # Quadrant labels — explicitly name both methods
    ax.text(0.38, 1.18, "Both methods agree:\nF > 0  ·  QG = OK",
            fontsize=8, color="#1D9E75", ha="center",
            bbox=dict(boxstyle="round,pad=0.3", fc="white", ec="#1D9E75", alpha=0.7))
    ax.text(-0.28, -0.18, "Both methods agree:\nF < 0  ·  QG = ERROR",
            fontsize=8, color="#E24B4A", ha="center",
            bbox=dict(boxstyle="round,pad=0.3", fc="white", ec="#E24B4A", alpha=0.7))
    ax.text(0.25, -0.18, "Methods disagree:\nF > 0  ·  QG = ERROR",
            fontsize=8, color="#888", ha="center",
            bbox=dict(boxstyle="round,pad=0.3", fc="white", ec="#aaa", alpha=0.7))
    ax.text(-0.28, 1.18, "Methods disagree:\nF < 0  ·  QG = OK",
            fontsize=8, color="#888", ha="center",
            bbox=dict(boxstyle="round,pad=0.3", fc="white", ec="#aaa", alpha=0.7))

    ax.axvline(0, color="black", linewidth=0.8, linestyle="--", alpha=0.4)
    ax.axhline(0.5, color="#aaa", linewidth=0.5, linestyle=":")

    # Axis labels — explicitly name both methods
    ax.set_yticks([0, 1])
    ax.set_yticklabels(["ERROR", "OK"], fontsize=12, fontweight="bold")
    ax.set_xlabel("Fitness function F score  (proposed method)", fontsize=11)
    ax.set_ylabel("SonarQube Quality Gate verdict  (baseline method)", fontsize=11)
    ax.set_title(
        "Proposed fitness function (X-axis) vs SonarQube Quality Gate (Y-axis)\n"
        "across 12 controlled experiments",
        fontsize=12
    )
    ax.set_ylim(-0.3, 1.3)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.grid(axis="x", alpha=0.15)

    # Two-part legend: categories + method explanation
    from matplotlib.lines import Line2D
    category_handles = [
        mpatches.Patch(color=c, label=k)
        for k, c in CATEGORY_COLORS.items()
    ]
    method_handles = [
        Line2D([0], [0], color="none", label="── Methods ──"),
        mpatches.Patch(color="#378ADD", label="X-axis: fitness function F (continuous, −1 to +1)"),
        mpatches.Patch(color="#888", label="Y-axis: SonarQube Quality Gate (binary: OK / ERROR)"),
    ]
    ax.legend(
        handles=category_handles + method_handles,
        fontsize=8.5,
        loc="lower right",
        framealpha=0.6,
        title="Experiment category & methods",
        title_fontsize=9,
    )

    plt.tight_layout()
    if save:
        _ensure_output_dir()
        fig.savefig(f"{OUTPUT_DIR}/qg_vs_f.png", dpi=150, bbox_inches="tight")
        print(f"Saved: {OUTPUT_DIR}/qg_vs_f.png")
    return fig

def plot_descriptive_stats_table(df: pd.DataFrame, save: bool = True) -> plt.Figure:
    """Render descriptive statistics as a formatted table figure (paper-ready)."""
    from statistics_analysis import descriptive_stats_table

    table = descriptive_stats_table(df).reset_index()

    fig, ax = plt.subplots(figsize=(14, 3))
    ax.axis("off")

    col_labels = list(table.columns)
    cell_data  = table.values.tolist()

    tbl = ax.table(
        cellText=cell_data,
        colLabels=col_labels,
        cellLoc="center",
        loc="center",
    )
    tbl.auto_set_font_size(False)
    tbl.set_fontsize(10)
    tbl.scale(1.2, 1.8)

    # Style header
    for j in range(len(col_labels)):
        tbl[(0, j)].set_facecolor("#2C5F8A")
        tbl[(0, j)].set_text_props(color="white", fontweight="bold")

    # Alternate row shading
    cat_colors = {
        "Improvement": "#E8F5EE",
        "Feature":     "#E8F0F8",
        "Degradation": "#FBE8E8",
        "Neutral":     "#F2F2F2",
    }
    for i, row in enumerate(cell_data):
        cat = str(row[0])
        color = cat_colors.get(cat, "white")
        for j in range(len(col_labels)):
            tbl[(i + 1, j)].set_facecolor(color)

    ax.set_title(
        "Descriptive statistics of fitness function score (F) by experiment category",
        fontsize=12, pad=16, fontweight="500"
    )
    plt.tight_layout()

    if save:
        _ensure_output_dir()
        fig.savefig(f"{OUTPUT_DIR}/stats_descriptive_table.png", dpi=150, bbox_inches="tight")
        print(f"Saved: {OUTPUT_DIR}/stats_descriptive_table.png")
    return fig


def print_summary(df: pd.DataFrame):
    stats = summary_stats(df)
    print("\n" + "=" * 50)
    print("  FITNESS METRICS ANALYZER — SUMMARY")
    print("=" * 50)
    print(f"  Total experiments:        {stats['total_experiments']}")
    print(f"  Correct F direction:      {stats['correct_direction']} / {stats['total_experiments']}")
    print(f"  QG correctly flagged:     {stats['qg_correctly_flagged']} / {stats['total_experiments']}")
    print(f"  Mean F — improvement:     {stats['mean_f_improvement']:.4f}")
    print(f"  Mean F — feature:         {stats['mean_f_feature']:.4f}")
    print(f"  Mean F — degradation:     {stats['mean_f_degradation']:.4f}")
    print(f"  Mean F — neutral:         {stats['mean_f_neutral']:.4f}")
    print("=" * 50 + "\n")