# Triage Report: PROD-4519

## Decision

Treat as a P2 incident. Candidate cause is the recent `signing-service` URL-TTL reduction; perform the runbook's regional latency comparison to confirm before reverting, and coordinate with the team that requested the security-review TTL change.

## Severity

`P2`

Consistent customer-facing latency on mobile uploads (30-60s, latency tripled on `POST /uploads/images`) across iOS and Android, with a known next diagnostic step in the runbook. Not a broad outage; uploads complete eventually.

## Likely Cause

Candidate: `signing-service v2.1.4` ("Reduce URL TTL for security review") deployed 2026-05-17T11:22:00Z, with `files_changed: ["config/prod.yaml"]`. The `runbooks/cdn-upload-latency.md` runbook calls out a known bug where reducing `URL_TTL_SECONDS` (previously dropped to 300) causes uploads to stall waiting for signature validation — exactly this symptom signature (high latency, no backend errors, CDN dashboard normal).

Timing caveat: the issue body says intermittent reports "started 2 days ago" (i.e. ~2026-05-16, before the 2026-05-17 deploy) but became "consistent" by the report date 2026-05-18. The deploy is the best-supported candidate that turned an intermittent issue into a consistent one, but the pre-deploy intermittent reports are not fully explained by it.

## Evidence

- `issues/PROD-4519.json`: 30-60s upload times for product photos in mobile app; iOS and Android both affected; CDN dashboard shows normal traffic patterns; backend logs show no errors; latency on `POST /uploads/images` has tripled; reported 2026-05-18T09:42:11Z.
- `deploys/recent.json`: `signing-service v2.1.4`, commit `a87f2dd`, deployed 2026-05-17T11:22:00Z, summary "Reduce URL TTL for security review", files changed `config/prod.yaml`; `rollback_available: true`, `last_known_good: v2.1.3`.
- `runbooks/cdn-upload-latency.md`: Symptoms (30+s uploads, no backend errors, CDN dashboard normal) match exactly. Documents a known bug in pre-signed URL TTL — uploads stall waiting for signature validation. Fix: set `URL_TTL_SECONDS` in `signing-service/config/prod.yaml` to 3600 (was reduced to 300 in PR #4189). First check: compare upload latency by region.

## Immediate Actions

- Run the runbook's first check: compare upload latency by region in the CDN dashboard ("Uploads → POST" panel). If only one region is bad, file with the CDN vendor. If all regions are bad, treat as our problem.
- If our problem: restore `URL_TTL_SECONDS` to 3600 in `signing-service/config/prod.yaml`, or roll back to `v2.1.3`. Coordinate with whoever requested the security-review TTL reduction before reverting — the change was deliberate.
- Pull pre-2026-05-17 logs to characterize the intermittent reports so the timing caveat above is resolved before a permanent decision.

## Customer/Internal Update

Customer support reply (draft only):
> Thanks for flagging — we are investigating elevated upload times for product photos in the mobile app. A configuration change last week looks like the most likely cause; we are validating now and expect to either revert or work around it shortly.

Internal Slack `#platform-oncall` (draft only):
> P2 — mobile image uploads at 30-60s, latency tripled on `POST /uploads/images`, iOS+Android, no backend errors, CDN normal. Candidate: `signing-service v2.1.4` on 2026-05-17 reduced URL TTL for security review — matches the documented signed-URL TTL bug in `runbooks/cdn-upload-latency.md`. Running regional latency comparison now; if our problem, will coordinate with security on restoring `URL_TTL_SECONDS=3600` or rolling back to `v2.1.3`. Timing caveat: intermittent reports predate the deploy by ~1 day.

## Confidence

`Medium`: runbook symptom match, deploy summary, and changed file all point at the same cause, but the issue's "started intermittently 2 days ago" predates the deploy, so the deploy alone does not explain the full history. Regional comparison and pre-deploy log review are required before reverting.

## Missing Data

- Regional breakdown of upload latency (CDN dashboard) — required by runbook before action.
- Pre-2026-05-17 backend latency series on `POST /uploads/images` to characterize the intermittent phase.
- Context on which team requested the URL-TTL reduction for security review and whether reverting is acceptable.
- Whether `URL_TTL_SECONDS=300` is the value currently in `signing-service/config/prod.yaml` post-deploy (the deploy summary implies a reduction but does not state the final value).
