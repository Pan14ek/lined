# fitness-metrics-analyzer

Analysis tool for the research paper:
**"Study of Variability of Architectural Metrics During the Evolution of a Software System in CI/CD Conditions"**

Fetches experiment pipeline run data from Amazon DynamoDB, generates publication-ready charts, and performs statistical analysis of fitness function scores across controlled experiments on the [Lined](https://github.com/Pan14ek/lined) Spring Boot backend.

## Background

The fitness function `F` is a weighted composite metric (range −1 to +1) computed by the CI/CD pipeline after each pull request:

```
F = 0.25 × normalize(spotbugs)
  + 0.25 × normalize(critical_violations)
  + 0.30 × normalize(jacoco_line_coverage)
  + 0.07 × normalize(code_smells)
  + 0.07 × normalize(duplicated_lines_density)
  + 0.06 × normalize(checkstyle_violations)
```

- **F > 0** → quality improved relative to main baseline
- **F < 0** → quality degraded
- **F ≈ 0** → neutral change

## Setup

```bash
pip3 install -r requirements.txt
```

Requires Python 3.9+.

## Usage

```bash
# Configure an AWS profile or other standard AWS credentials, then select the table.
export AWS_METRICS_REGION="eu-north-1"
export AWS_METRICS_TABLE_NAME="pipeline-runs"

# Run everything (charts + statistics)
python3 main.py

# Or pass the DynamoDB location directly
python3 main.py --region eu-north-1 --table-name pipeline-runs

# Generate a specific chart only
python3 main.py --chart bar        # F score bar chart
python3 main.py --chart category   # F score by category scatter
python3 main.py --chart metrics    # Raw metrics (SpotBugs, JaCoCo, Checkstyle)
python3 main.py --chart timeline   # F score over experiment order
python3 main.py --chart qg         # SonarQube QG vs F score
python3 main.py --chart table      # Descriptive statistics table

# Show charts interactively instead of saving to files
python3 main.py --no-save
```

## Output

All files are saved to `./output/`:

### Charts

| File | Description |
|------|-------------|
| `f_scores_bar.png` | F score per experiment, sorted descending, colored by category |
| `f_scores_by_category.png` | F score scatter per category with mean line |
| `raw_metrics.png` | JaCoCo coverage, SpotBugs violations, Checkstyle violations per experiment |
| `f_over_time.png` | F score evolution in chronological experiment order |
| `qg_vs_f.png` | SonarQube Quality Gate (binary) vs F score (continuous) with quadrant shading |
| `stats_descriptive_table.png` | Formatted descriptive statistics table (paper-ready) |

### Statistical analysis (CSV)

| File | Description |
|------|-------------|
| `stats_descriptive.csv` | Mean, median, P5, P95, std, variance, min, max per category |
| `stats_normality.csv` | Shapiro-Wilk normality test per category |
| `stats_tests.csv` | Mann-Whitney U, Kruskal-Wallis H, Cohen's d results |
| `stats_spearman.csv` | Spearman correlation between individual metrics and F score |

## Project structure

```
fitness-metrics-analyzer/
├── main.py                 # Entry point and CLI
├── dynamodb_client.py      # DynamoDB access and document normalization
├── data.py                 # Data processing, categorization, statistics
├── charts.py               # Chart generation (matplotlib)
├── statistics_analysis.py  # Statistical tests (scipy)
├── requirements.txt
└── README.md
```

## Experiment categories

Only `experiment/` branches are included in the analysis. Feature branches are excluded.

## Storage boundary

The DynamoDB table starts a new collection period. Historical Cosmos DB documents
are intentionally not migrated, so figures generated from DynamoDB contain only
runs collected after this migration.

| Category | Branch pattern | Expected F | N |
|----------|---------------|------------|---|
| improvement | `experiment/improve-*`, `experiment/fix-*` | F > 0 | 3 |
| degradation | `experiment/degrade-*` | F < 0 | 4 |
| neutral | `experiment/neutral-*` | F ≈ 0 | 4 |

## Key findings

| Test | Result |
|------|--------|
| Mann-Whitney U (improvement vs degradation) | **p=0.029** — significant ✅ |
| Mann-Whitney U (improvement vs neutral) | p=0.180 — not significant ⚠️ |
| Kruskal-Wallis H (all categories) | p=0.067 — not significant (small N) |
| Cohen's d (improvement vs degradation) | **d=2.84 (large effect)** ✅ |
| Cohen's d (improvement vs neutral) | d=1.52 — inflated by SonarCloud bias |

**SonarCloud PR-scoping bias:** `critical_violations`, `code_smells`, and `duplicated_lines_density` are fetched at PR scope (changed files only), not full project. This creates a systematic positive bias for small PRs touching clean files, causing neutral experiments to produce F ≈ +0.32 instead of F ≈ 0.
