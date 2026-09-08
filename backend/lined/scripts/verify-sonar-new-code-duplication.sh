#!/usr/bin/env bash
set -euo pipefail

if [[ "${GITHUB_EVENT_NAME:-}" != "pull_request" ]]; then
  echo "Sonar new-code duplication verification is PR-scoped; skipping outside pull requests."
  exit 0
fi

: "${SONAR_TOKEN:?SONAR_TOKEN is required for PR duplication verification}"
: "${PR_NUMBER:?PR_NUMBER is required for PR duplication verification}"

response="$(curl --fail --silent --show-error \
  --user "${SONAR_TOKEN}:" \
  --get 'https://sonarcloud.io/api/measures/component' \
  --data-urlencode 'component=Pan14ek_lined' \
  --data-urlencode 'metricKeys=new_duplicated_lines_density' \
  --data-urlencode "pullRequest=${PR_NUMBER}")"

if ! printf '%s' "${response}" | jq -e --arg pr "${PR_NUMBER}" \
  '(.component.pullRequest? | tostring) == $pr and (.component.measures? | type) == "array"' \
  >/dev/null; then
  echo "Sonar returned an invalid response for PR ${PR_NUMBER}."
  exit 1
fi

value="$(printf '%s' "${response}" | jq -r '.component.measures[]? | select(.metric == "new_duplicated_lines_density") | .value // empty')"
if [[ -z "${value}" ]]; then
  value="0.0"
  echo "Sonar returned no new-code duplication measure for PR ${PR_NUMBER}; treating it as 0.0."
fi

if ! awk "BEGIN { exit !(${value} <= 0.0) }"; then
  echo "Sonar new-code duplication is ${value}; required threshold is 0.0."
  exit 1
fi

echo "Sonar new-code duplication gate passed: ${value} <= 0.0."
