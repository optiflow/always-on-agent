# Always-On Agent Instructions

## Purpose

This repo is a hackathon-ready Always-On Ops Agent demo. It gives Claude Routine a
small enterprise workspace:

- `issues/`: open production signals and one backlog item.
- `deploys/recent.json`: recent deploy history for incident correlation.
- `runbooks/`: operational playbooks.
- `contracts/`: vendor contracts.
- `compliance-policy.md`: policy used for compliance drift checks.
- `packages/core`: deterministic TypeScript scanner and action draft logic.
- `apps/web`: local dashboard for the judge demo.
- `apps/docs`: Starlight docs for setup and demo flow.

All company names, incidents, contracts, and systems are fictional.

## Commands

- Install: `pnpm install`
- Local demo: `pnpm dev`
- Deterministic agent JSON: `pnpm agent:run`
- Tests: `pnpm test`
- Lint: `pnpm lint`
- Build: `pnpm build`
- Smoke checks: `pnpm smoke`
- Fire Claude Routine: `pnpm routine:fire -- "Analyze issue PROD-4521 and write reports/triage-PROD-4521.md"`

## Ground Rules

- Use repo files as the source of truth. Do not invent logs, deploys, clauses, or
  policy text.
- Keep changes small and tied to the task. Do not refactor core logic unless asked.
- Preserve public TypeScript exports unless the task asks for an API change.
- Draft external messages only. Do not send Slack messages, GitHub comments, emails,
  or API calls unless a human explicitly asks.
- If evidence is weak, say so and route to human review.
- If a contract clause is unclear, mark it as `needs legal review`.
- Do not commit secrets. Use `.env` locally and `.env.example` for names only.

## Incident Triage Flow

For issue triage:

1. Read the target issue in `issues/`.
2. Check `deploys/recent.json` for deploys near the incident time.
3. Read relevant runbooks in `runbooks/`.
4. Decide whether the item is an incident or backlog work.
5. Pick severity from the evidence:
   - `P0`: broad customer impact, payment outage, or high active-user impact.
   - `P1`: tenant-specific customer impact or major account risk.
   - `P2`: intermittent production impact with known next diagnostic step.
   - `P3`: weak signal or low confidence.
   - `feature`: planned work, not an incident.
6. Recommend the next action only when issue, deploy, and runbook evidence support it.

Known demo paths:

- `PROD-4521`: primary demo. Link `PaymentService.java:142`, `payment-service v4.8.2`,
  guest checkout, and `runbooks/payment-service-degraded.md`.
- `PROD-4487`: Acme tenant demo. Link Acme to the `guest-checkout` cohort in
  `deploys/recent.json`.
- `PROD-4498`: auth backup demo. Link upstream timeouts to the auth 502 runbook.
- `PROD-4506`: classify as backlog work, not an incident.

## Compliance Scan Flow

For compliance work:

1. Read `compliance-policy.md`.
2. Read every file in `contracts/`.
3. Check each contract against data residency, audit rights, termination,
   liability cap, subprocessor notice, breach notice, and governing law.
4. Mark each contract `pass`, `fail`, or `needs legal review`.
5. Cite exact file paths and contract language in the report.

Known demo path:

- `globex-messaging.md` should pass.
- `acme-data-platform.md` should fail clear policy checks.
- `sirius-storage.md` should fail more checks than Acme.

## Report Contract

Write incident reports to `reports/triage-<ISSUE_ID>.md`.

Write compliance reports to `reports/compliance-scan.md`.

Every incident report must include these sections in this order:

1. `# Triage Report: <ISSUE_ID>`
2. `## Decision`
3. `## Severity`
4. `## Likely Cause`
5. `## Evidence`
6. `## Immediate Actions`
7. `## Customer/Internal Update`
8. `## Confidence`
9. `## Missing Data`

The evidence section must list exact paths, such as `issues/PROD-4521.json`,
`deploys/recent.json`, and `runbooks/payment-service-degraded.md`.

Every compliance report must include:

1. `# Compliance Scan`
2. `## Decision`
3. `## Policy Source`
4. `## Results`
5. `## Evidence`
6. `## Immediate Actions`
7. `## Confidence`
8. `## Missing Data`

## Routine Success Criteria

A good Claude Routine run:

- creates or updates the expected file under `reports/`;
- cites exact source paths;
- states confidence and missing data;
- drafts human-readable Slack/GitHub copy without sending it;
- leaves code and tests unchanged unless the task asks for implementation work.
