#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
docs="${root}/docs/engineering"

require_file() {
  [[ -f "${docs}/$1" ]] || { echo "Missing engineering document: $1" >&2; exit 1; }
}

require_file README.md
require_file registry/LINED_PATTERN_REGISTRY.md

[[ "$(find "${docs}/principles" -type f -name '*.md' | wc -l | tr -d ' ')" == 11 ]]
[[ "$(find "${docs}/code-smells" -type f -name '*.md' | wc -l | tr -d ' ')" == 22 ]]
[[ "$(find "${docs}/refactoring" -type f -name '*.md' | wc -l | tr -d ' ')" == 66 ]]
[[ "$(find "${docs}/design-patterns/gof" -type f -name '*.md' | wc -l | tr -d ' ')" == 23 ]]
[[ "$(find "${docs}/design-patterns/backend" -type f -name '*.md' | wc -l | tr -d ' ')" == 14 ]]
[[ "$(find "${docs}/design-patterns/frontend" -type f -name '*.md' | wc -l | tr -d ' ')" == 11 ]]
[[ "$(find "${docs}/decision-guides" -type f -name '*.md' | wc -l | tr -d ' ')" == 10 ]]

if rg -n 'refactoring\.guru|martinfowler\.com' "${docs}"; then
  echo 'Engineering docs must remain self-contained and must not require external references.' >&2
  exit 1
fi

echo 'Engineering documentation structure and self-contained reference check passed.'
