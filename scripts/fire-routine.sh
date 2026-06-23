#!/usr/bin/env bash
set -euo pipefail

DEFAULT_PROMPT="Analyze issue PROD-4521. Use only this repo. Write reports/triage-PROD-4521.md with exact evidence paths, immediate actions, confidence, and missing data."
if [ "$#" -gt 0 ]; then
  PROMPT="$*"
else
  PROMPT="$DEFAULT_PROMPT"
fi

if [ -f ".env" ]; then
  set -a
  # shellcheck disable=SC1091
  . ".env"
  set +a
fi

if [ -z "${ROUTINE_FIRE_URL:-}" ]; then
  echo "Missing ROUTINE_FIRE_URL. Copy .env.example to .env and fill it in." >&2
  exit 1
fi

if [ -z "${ROUTINE_BEARER_TOKEN:-}" ]; then
  echo "Missing ROUTINE_BEARER_TOKEN. Copy .env.example to .env and fill it in." >&2
  exit 1
fi

python3 - "$PROMPT" <<'PY' | curl -sS -X POST "$ROUTINE_FIRE_URL" \
  -H "Authorization: Bearer $ROUTINE_BEARER_TOKEN" \
  -H "anthropic-beta: experimental-cc-routine-2026-04-01" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  --data-binary @-
import json
import sys

print(json.dumps({"text": sys.argv[1]}))
PY
printf "\n"
