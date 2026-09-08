#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
docs="${root}/docs/engineering"

require_file() {
  [[ -f "${docs}/$1" ]] || { echo "Missing engineering document: $1" >&2; exit 1; }
}

require_count() {
  local directory="$1"
  local expected="$2"
  local actual
  actual="$(find "${docs}/${directory}" -type f -name '*.md' | wc -l | tr -d ' ')"
  if [[ "${actual}" != "${expected}" ]]; then
    echo "Expected ${expected} Markdown files in ${directory}; found ${actual}." >&2
    exit 1
  fi
}

require_file README.md
require_file registry/LINED_PATTERN_REGISTRY.md

require_count principles 11
require_count code-smells 22
require_count refactoring 66
require_count design-patterns/gof 23
require_count design-patterns/backend 14
require_count design-patterns/frontend 11
require_count decision-guides 10

if rg -n 'refactoring\.guru|martinfowler\.com' "${docs}"; then
  echo 'Engineering docs must remain self-contained and must not require external references.' >&2
  exit 1
fi

echo 'Engineering documentation structure and self-contained reference check passed.'
