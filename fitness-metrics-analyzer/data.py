import pandas as pd
from typing import Optional, List


CATEGORY_MAP = {
    "improve":  "improvement",
    "fix":      "improvement",
    "reduce":   "improvement",
    "feature":  "feature",
    "degrade":  "degradation",
    "neutral":  "neutral",
}

CATEGORY_COLORS = {
    "improvement": "#1D9E75",
    "degradation": "#E24B4A",
    "neutral":     "#888780",
    "feature":     "#378ADD",
}

EXPECTED_DIRECTION = {
    "improvement": "F > 0",
    "degradation": "F < 0",
    "neutral":     "F ≈ 0",
    "feature":     "F > 0",
}


def categorize(branch: str) -> str:
    branch_lower = branch.lower()
    for keyword, category in CATEGORY_MAP.items():
        if keyword in branch_lower:
            return category
    return "other"


def short_name(branch: str) -> str:
    """Strip experiment/ or feature/ prefix for display."""
    for prefix in ("experiment/", "feature/"):
        if branch.startswith(prefix):
            return branch[len(prefix):]
    return branch


def build_dataframe(items: List[dict]) -> pd.DataFrame:
    """Convert raw Cosmos DB items into a clean analysis DataFrame."""
    rows = []
    for item in items:
        sonar_main = item.get("sonar_cloud_main_branch_metrics") or {}
        sonar_curr = item.get("sonar_cloud_current_branch_metrics") or {}

        rows.append({
            "branch":                  item.get("branch", ""),
            "short_name":              short_name(item.get("branch", "")),
            "pull_request_id":         item.get("pullRequestId"),
            "timestamp":               item.get("timestamp"),
            "fitness_score":           item.get("fitnessScore"),
            "jacoco_line_coverage":    item.get("jacoco_line_coverage"),
            "spotbugs_total":          item.get("spotbugs_total"),
            "checkstyle_violations":   item.get("checkstyle_violations"),
            "critical_violations_main":    _to_float(sonar_main.get("critical_violations")),
            "critical_violations_curr":    _to_float(sonar_curr.get("critical_violations")),
            "code_smells_main":            _to_float(sonar_main.get("code_smells")),
            "code_smells_curr":            _to_float(sonar_curr.get("code_smells")),
            "duplicated_lines_density_main": _to_float(sonar_main.get("duplicated_lines_density")),
            "duplicated_lines_density_curr": _to_float(sonar_curr.get("duplicated_lines_density")),
            "sonarqube_qg":            sonar_curr.get("alert_status", "UNKNOWN"),
        })

    df = pd.DataFrame(rows)
    df["category"] = df["branch"].apply(categorize)
    df["color"] = df["category"].map(CATEGORY_COLORS).fillna("#AAAAAA")
    df["expected_direction"] = df["category"].map(EXPECTED_DIRECTION)
    df["correct_direction"] = df.apply(_check_direction, axis=1)
    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")

    return df.sort_values("fitness_score", ascending=False).reset_index(drop=True)


def _to_float(value) -> Optional[float]:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _check_direction(row) -> bool:
    f = row["fitness_score"]
    if f is None:
        return False
    cat = row["category"]
    if cat in ("improvement", "feature"):
        return f > 0
    elif cat == "degradation":
        return f < 0
    elif cat == "neutral":
        return abs(f) < 0.05
    return False


def summary_stats(df: pd.DataFrame) -> dict:
    return {
        "total_experiments":       len(df),
        "correct_direction":       df["correct_direction"].sum(),
        "qg_correctly_flagged":    (
            ((df["category"] == "degradation") & (df["sonarqube_qg"] == "ERROR")).sum() +
            ((df["category"].isin(["improvement", "feature", "neutral"])) & (df["sonarqube_qg"] == "OK")).sum()
        ),
        "mean_f_improvement":      df[df["category"] == "improvement"]["fitness_score"].mean(),
        "mean_f_degradation":      df[df["category"] == "degradation"]["fitness_score"].mean(),
        "mean_f_neutral":          df[df["category"] == "neutral"]["fitness_score"].mean(),
        "mean_f_feature":          df[df["category"] == "feature"]["fitness_score"].mean(),
    }