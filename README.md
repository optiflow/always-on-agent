# Always-On Ops Agent

This repo is a hackathon handoff for an evidence-first Claude Routine. It lets a
teammate create a routine that reads local synthetic enterprise data, triages incidents,
scans contracts for compliance drift, and writes durable Markdown reports.

The demo claim is simple: the agent does the first 10 minutes of ops work, cites exact
repo evidence, drafts the next action, and waits for human approval.

## What Is Here

- `issues/`: open production signals and one backlog item.
- `deploys/recent.json`: recent deploys for incident correlation.
- `runbooks/`: operational playbooks.
- `contracts/`: vendor contracts.
- `compliance-policy.md`: compliance policy.
- `AGENTS.md`: shared repo and routine operating rules.
- `CLAUDE.md`: Claude Code entrypoint that imports `AGENTS.md`.
- `reports/`: routine output folder and templates.
- `scripts/fire-routine.sh`: API trigger helper.
- `apps/web`: local React dashboard.
- `apps/docs`: Starlight docs and demo script.

All data is fictional.

## Run Locally

```bash
pnpm install
pnpm dev
```

Open the web dashboard, click **Run now**, select `PROD-4521`, and show the evidence
chain from issue to deploy to runbook.

## Create The Claude Routine

1. Push this repo to GitHub.
2. Open Claude Code Routines and create a new routine.
3. Attach this repository.
4. Use the default cloud environment and remove unneeded connectors.
5. Use **Run now** first.
6. Add an API trigger for the live demo.

Routine prompt:

```text
You are the Always-On Ops Agent for this repo.
Read CLAUDE.md and AGENTS.md before acting.
Use only repo files unless the trigger text explicitly asks for external lookup.
For incident work, write reports/triage-<ISSUE_ID>.md.
For compliance work, write reports/compliance-scan.md.
Cite exact file paths, state confidence, list missing data, and draft external messages only.
Do not send Slack messages, GitHub comments, emails, or API calls.
```

## Fire The API Trigger

```bash
cp .env.example .env
# Fill ROUTINE_FIRE_URL and ROUTINE_BEARER_TOKEN in .env.

pnpm routine:fire -- "Analyze issue PROD-4521. Use only this repo. Write reports/triage-PROD-4521.md with exact evidence paths."
```

The response should include a Claude Code session URL. Open it to watch the run and
review the report branch.

## Best Demo Prompts

```text
Analyze issue PROD-4521. Use only this repo. Write reports/triage-PROD-4521.md.
```

```text
Analyze issue PROD-4487. Determine whether Acme tenant checkout failure links to a recent feature flag. Write reports/triage-PROD-4487.md.
```

```text
Scan contracts/ against compliance-policy.md. Write reports/compliance-scan.md.
```

## Verify

```bash
pnpm lint
pnpm test
pnpm build
pnpm smoke
```

Expected report outputs:

- `reports/triage-PROD-4521.md`
- `reports/triage-PROD-4487.md`
- `reports/compliance-scan.md`
