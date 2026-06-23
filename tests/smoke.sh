#!/usr/bin/env bash
set -euo pipefail

python3 - <<'PY'
import json
import pathlib

for path in pathlib.Path("issues").glob("*.json"):
    json.loads(path.read_text())

json.loads(pathlib.Path("deploys/recent.json").read_text())
print("JSON parse OK")
PY

for path in AGENTS.md CLAUDE.md .env.example scripts/fire-routine.sh reports/README.md reports/triage-template.md reports/compliance-template.md; do
  test -f "$path"
done

grep -q "@AGENTS.md" CLAUDE.md
grep -q "reports/triage-<ISSUE_ID>.md" AGENTS.md
grep -q "experimental-cc-routine-2026-04-01" scripts/fire-routine.sh

pnpm test

if [ -f "reports/triage-PROD-4521.md" ]; then
  grep -q "PaymentService.java:142" reports/triage-PROD-4521.md
  grep -q "deploys/recent.json" reports/triage-PROD-4521.md
  grep -q "runbooks/payment-service-degraded.md" reports/triage-PROD-4521.md
fi

if [ -f "reports/compliance-scan.md" ]; then
  grep -q "contracts/acme-data-platform.md" reports/compliance-scan.md
  grep -q "contracts/globex-messaging.md" reports/compliance-scan.md
  grep -q "contracts/sirius-storage.md" reports/compliance-scan.md
fi

echo "Smoke checks passed"
