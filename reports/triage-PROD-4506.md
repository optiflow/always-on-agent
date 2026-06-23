# Triage Report: PROD-4506

## Decision

**Backlog work, not an incident.** This is a planned engineering feature request. No production systems are degraded. No immediate action required.

## Severity

**Feature** — Planned capability work. Not a production incident.

## Likely Cause

N/A — this is a feature request, not a failure. The current `WorkerPool` serialises batch jobs by design. The request is to extend it with a `max_concurrency` setting (default 1) and a back-pressure signal to support the upcoming ingestion pipeline.

## Evidence

- `issues/PROD-4506.json` — opened 2026-05-15T16:01:00Z by priya.shah@bts-synthetic.example; proposes adding `max_concurrency` to `WorkerPool`; no monitoring alert, no error reports, no customer impact
- `deploys/recent.json` — no deploy correlated to this item

## Immediate Actions

1. Assign to the team responsible for the ingestion pipeline (priya.shah or engineering lead).
2. Prioritise in the backlog against the ingestion pipeline delivery date.
3. No on-call response or rollback needed.

## Customer/Internal Update

No customer-facing communication needed. Internal engineering ticket only.

**Draft engineering backlog note:**
> PROD-4506 is a feature request to add `max_concurrency` to `WorkerPool` for the new ingestion pipeline. No production impact. Recommend scheduling in the next sprint that precedes the ingestion pipeline delivery milestone.

## Confidence

**High.** Issue description is explicit that this is a proposal, not a fault report. No monitoring alerts, no errors, no customer complaints.

## Missing Data

- Target delivery date for the ingestion pipeline (determines backlog priority).
- Whether any other teams depend on `WorkerPool` and would be affected by the API change.
