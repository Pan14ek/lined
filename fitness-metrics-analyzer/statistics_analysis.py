"""
statistics_analysis.py
======================
Statistical analysis of fitness function experiment results.

Tests performed:
- Descriptive statistics per category
- Mann-Whitney U test (improvement vs degradation)
- Kruskal-Wallis test (all categories)
- Spearman correlation (metrics vs F score)
- Cohen's d effect size (improvement vs degradation)
"""

import pandas as pd
import numpy as np
from scipy import stats
from typing import Tuple


# ─── Descriptive statistics ────────────────────────────────────────────────────

def descriptive_stats_table(df: pd.DataFrame) -> pd.DataFrame:
    """
    Descriptive statistics table matching academic paper format.
    Rows = categories, Columns = count, mean, P5, P95, std, variance, min, max.
    """
    rows = []
    for cat in ["improvement", "feature", "degradation", "neutral"]:
        vals = df[df["category"] == cat]["fitness_score"].dropna()
        if len(vals) == 0:
            continue
        rows.append({
            "Category":  cat.capitalize(),
            "N":         len(vals),
            "Mean":      round(vals.mean(), 4),
            "Median":    round(vals.median(), 4),
            "P5 (%)":    round(np.percentile(vals, 5), 4),
            "P95 (%)":   round(np.percentile(vals, 95), 4),
            "Std":       round(vals.std(), 4),
            "Variance":  round(vals.var(), 6),
            "Min":       round(vals.min(), 4),
            "Max":       round(vals.max(), 4),
        })
    return pd.DataFrame(rows).set_index("Category")


# ─── Mann-Whitney U test ────────────────────────────────────────────────────────

def mann_whitney_test(
    df: pd.DataFrame,
    cat_a: str = "improvement",
    cat_b: str = "degradation",
) -> dict:
    """
    Non-parametric Mann-Whitney U test comparing F scores of two categories.
    Preferred over t-test for small, non-normal samples.

    H0: The two groups have the same distribution.
    H1: One group tends to have higher F scores.
    """
    a = df[df["category"] == cat_a]["fitness_score"].dropna()
    b = df[df["category"] == cat_b]["fitness_score"].dropna()

    statistic, p_value = stats.mannwhitneyu(a, b, alternative="greater")

    return {
        "test": "Mann-Whitney U",
        "group_a": cat_a,
        "group_b": cat_b,
        "n_a": len(a),
        "n_b": len(b),
        "statistic": round(statistic, 4),
        "p_value": round(p_value, 6),
        "significant": p_value < 0.05,
        "interpretation": (
            f"{'Significant' if p_value < 0.05 else 'Not significant'}: "
            f"{cat_a} F scores are {'significantly' if p_value < 0.05 else 'not significantly'} "
            f"higher than {cat_b} (p={p_value:.4f})"
        ),
    }


# ─── Kruskal-Wallis test ───────────────────────────────────────────────────────

def kruskal_wallis_test(df: pd.DataFrame) -> dict:
    """
    Non-parametric Kruskal-Wallis test across all categories.
    Tests whether any category has a different F score distribution.

    H0: All categories have the same distribution.
    H1: At least one category differs.
    """
    groups = [
        df[df["category"] == cat]["fitness_score"].dropna().values
        for cat in ["improvement", "feature", "degradation", "neutral"]
        if len(df[df["category"] == cat]) > 0
    ]

    statistic, p_value = stats.kruskal(*groups)

    return {
        "test": "Kruskal-Wallis H",
        "statistic": round(statistic, 4),
        "p_value": round(p_value, 6),
        "significant": p_value < 0.05,
        "interpretation": (
            f"{'Significant' if p_value < 0.05 else 'Not significant'}: "
            f"category groups {'do' if p_value < 0.05 else 'do not'} differ "
            f"significantly (p={p_value:.4f})"
        ),
    }


# ─── Cohen's d effect size ────────────────────────────────────────────────────

def cohens_d(
    df: pd.DataFrame,
    cat_a: str = "improvement",
    cat_b: str = "degradation",
) -> dict:
    """
    Cohen's d effect size between two groups.
    Measures practical significance beyond p-value.

    Interpretation:
        d < 0.2  → negligible
        0.2–0.5  → small
        0.5–0.8  → medium
        d > 0.8  → large
    """
    a = df[df["category"] == cat_a]["fitness_score"].dropna()
    b = df[df["category"] == cat_b]["fitness_score"].dropna()

    mean_diff = a.mean() - b.mean()
    pooled_std = np.sqrt(
        (a.std() ** 2 + b.std() ** 2) / 2
    )
    d = mean_diff / pooled_std if pooled_std > 0 else float("nan")

    if abs(d) < 0.2:
        magnitude = "negligible"
    elif abs(d) < 0.5:
        magnitude = "small"
    elif abs(d) < 0.8:
        magnitude = "medium"
    else:
        magnitude = "large"

    return {
        "test": "Cohen's d",
        "group_a": cat_a,
        "group_b": cat_b,
        "mean_a": round(a.mean(), 4),
        "mean_b": round(b.mean(), 4),
        "d": round(d, 4),
        "magnitude": magnitude,
        "interpretation": (
            f"Effect size d={d:.3f} ({magnitude}): "
            f"{cat_a} mean F ({a.mean():.3f}) vs {cat_b} mean F ({b.mean():.3f})"
        ),
    }


# ─── Spearman correlation ─────────────────────────────────────────────────────

def spearman_correlation(df: pd.DataFrame) -> pd.DataFrame:
    """
    Spearman rank correlation between each raw metric and F score.
    Non-parametric — appropriate for small samples and non-normal distributions.
    """
    metrics = {
        "jacoco_line_coverage":  "JaCoCo line coverage",
        "spotbugs_total":        "SpotBugs violations",
        "checkstyle_violations": "Checkstyle violations",
    }

    rows = []
    for col, label in metrics.items():
        valid = df[[col, "fitness_score"]].dropna()
        if len(valid) < 3:
            continue
        rho, p = stats.spearmanr(valid[col], valid["fitness_score"])
        rows.append({
            "metric":          label,
            "rho":             round(rho, 4),
            "p_value":         round(p, 6),
            "significant":     p < 0.05,
            "interpretation":  (
                f"rho={rho:.3f}, p={p:.4f} "
                f"({'significant' if p < 0.05 else 'not significant'})"
            ),
        })

    return pd.DataFrame(rows).set_index("metric")


# ─── Shapiro-Wilk normality test ──────────────────────────────────────────────

def normality_test(df: pd.DataFrame) -> pd.DataFrame:
    """
    Shapiro-Wilk test for normality per category.
    Justifies use of non-parametric tests.

    H0: Data is normally distributed.
    """
    rows = []
    for cat in ["improvement", "degradation", "neutral"]:
        vals = df[df["category"] == cat]["fitness_score"].dropna()
        if len(vals) < 3:
            continue
        stat, p = stats.shapiro(vals)
        rows.append({
            "category": cat,
            "n": len(vals),
            "statistic": round(stat, 4),
            "p_value": round(p, 6),
            "normal": p > 0.05,
            "interpretation": (
                f"{'Normal' if p > 0.05 else 'Not normal'} distribution (p={p:.4f})"
            ),
        })
    return pd.DataFrame(rows).set_index("category")


# ─── Full report ──────────────────────────────────────────────────────────────

def print_full_report(df: pd.DataFrame):
    sep = "=" * 60

    print(f"\n{sep}")
    print("  STATISTICAL ANALYSIS — FITNESS FUNCTION EXPERIMENTS")
    print(sep)

    # Descriptive
    print("\n1. DESCRIPTIVE STATISTICS BY CATEGORY (F score)")
    print("-" * 60)
    table = descriptive_stats_table(df)
    print(table.to_string())

    # Normality
    print("\n2. SHAPIRO-WILK NORMALITY TEST")
    print("-" * 60)
    norm = normality_test(df)
    for cat, row in norm.iterrows():
        print(f"  {cat:15} {row['interpretation']}")
    print("  → Non-parametric tests are appropriate.")

    # Kruskal-Wallis
    print("\n3. KRUSKAL-WALLIS TEST (all categories)")
    print("-" * 60)
    kw = kruskal_wallis_test(df)
    print(f"  H={kw['statistic']}, p={kw['p_value']}")
    print(f"  {kw['interpretation']}")

    # Mann-Whitney
    print("\n4. MANN-WHITNEY U TEST")
    print("-" * 60)
    mw = mann_whitney_test(df, "improvement", "degradation")
    print(f"  improvement vs degradation: U={mw['statistic']}, p={mw['p_value']}")
    print(f"  {mw['interpretation']}")

    mw2 = mann_whitney_test(df, "improvement", "neutral")
    print(f"\n  improvement vs neutral:     U={mw2['statistic']}, p={mw2['p_value']}")
    print(f"  {mw2['interpretation']}")

    # Cohen's d
    print("\n5. COHEN'S D EFFECT SIZE")
    print("-" * 60)
    cd = cohens_d(df, "improvement", "degradation")
    print(f"  improvement vs degradation: {cd['interpretation']}")
    cd2 = cohens_d(df, "improvement", "neutral")
    print(f"  improvement vs neutral:     {cd2['interpretation']}")

    # Spearman
    print("\n6. SPEARMAN CORRELATION (metric vs F score)")
    print("-" * 60)
    corr = spearman_correlation(df)
    for metric, row in corr.iterrows():
        print(f"  {metric:30} {row['interpretation']}")

    print(f"\n{sep}\n")


def export_stats_csv(df: pd.DataFrame, output_dir: str = "output"):
    """Export all statistics to CSV files for use in the paper."""
    import os
    os.makedirs(output_dir, exist_ok=True)

    # Descriptive stats — paper-style table
    descriptive_stats_table(df).to_csv(f"{output_dir}/stats_descriptive.csv")

    # Spearman correlation
    spearman_correlation(df).to_csv(f"{output_dir}/stats_spearman.csv")

    # Normality
    normality_test(df).to_csv(f"{output_dir}/stats_normality.csv")

    # Combined test results
    mw  = mann_whitney_test(df, "improvement", "degradation")
    mw2 = mann_whitney_test(df, "improvement", "neutral")
    kw  = kruskal_wallis_test(df)
    cd  = cohens_d(df, "improvement", "degradation")
    cd2 = cohens_d(df, "improvement", "neutral")
    pd.DataFrame([mw, mw2, kw, cd, cd2]).to_csv(
        f"{output_dir}/stats_tests.csv", index=False
    )

    print(f"Saved: {output_dir}/stats_descriptive.csv")
    print(f"Saved: {output_dir}/stats_spearman.csv")
    print(f"Saved: {output_dir}/stats_normality.csv")
    print(f"Saved: {output_dir}/stats_tests.csv")