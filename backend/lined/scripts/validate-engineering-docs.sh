#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
backend_docs="${root}/docs/engineering"
shared_docs="${root}/../../docs/engineering"
web_docs="${root}/../../lined-web/docs/engineering"

require_file() {
  local base="$1"
  local path="$2"
  [[ -f "${base}/${path}" ]] || { echo "Missing engineering document: ${base}/${path}" >&2; exit 1; }
}

require_count() {
  local base="$1"
  local directory="$2"
  local expected="$3"
  local actual
  actual="$(find "${base}/${directory}" -type f -name '*.md' | wc -l | tr -d ' ')"
  if [[ "${actual}" != "${expected}" ]]; then
    echo "Expected ${expected} Markdown files in ${base}/${directory}; found ${actual}." >&2
    exit 1
  fi
}

require_file "${backend_docs}" README.md
require_file "${shared_docs}" README.md
require_file "${shared_docs}" registry/LINED_PATTERN_REGISTRY.md
require_file "${web_docs}" README.md

require_count "${backend_docs}" principles 11
require_count "${backend_docs}" code-smells 22
require_count "${backend_docs}" refactoring 66
require_count "${backend_docs}" design-patterns/backend 14
require_count "${backend_docs}" decision-guides 10
require_count "${shared_docs}" design-patterns/gof 23
require_count "${web_docs}" design-patterns 11

if rg -n 'refactoring\.guru|martinfowler\.com' \
  "${backend_docs}" "${shared_docs}" "${web_docs}"; then
  echo 'Engineering docs must remain self-contained and must not require external references.' >&2
  exit 1
fi

echo 'Engineering documentation structure and self-contained reference check passed.'
