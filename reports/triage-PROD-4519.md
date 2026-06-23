# Triage Report: PROD-4519

## Decision

**Incident — Active, degraded service.** Image uploads are consistently taking 30–60 seconds on both iOS and Android. The `signing-service v2.1.4` deploy (2026-05-17) reduced URL TTL and is the most likely cause of upload signature validation stalls, though the timing gap is wider than the runbook's 6-hour window.

## Severity

**P2** — Consistent production degradation, no data loss, no payment impact. Known diagnostic and fix path exists.

## Likely Cause

The `signing-service v2.1.4` deploy on 2026-05-17T11:22 UTC reduced URL TTL (summary: "Reduce URL TTL for security review"). The `runbooks/cdn-upload-latency.md` identifies a URL TTL bug where uploads stall during signature validation when TTL is too low (`URL_TTL_SECONDS` was reduced to 300 in PR #4189). The issue opened on 2026-05-18T09:42 UTC (~22 hours after the deploy) as intermittent and became consistent by the time of reporting. The 22-hour onset gap is wider than the runbook's 6-hour heuristic, but the symptom pattern matches exactly: 30–60s latency, no backend errors, CDN dashboard normal, both platforms affected. A gradual onset (intermittent → consistent) is consistent with a TTL that's marginal — uploads work but spend time retrying signature validation.

## Evidence

- `issues/PROD-4519.json` — 30–60s upload times, iOS and Android, CDN normal, backend no errors, POST /uploads/images latency tripled, started intermittently 2 days before report, now consistent
- `deploys/recent.json` — `signing-service v2.1.4` at `2026-05-17T11:22:00Z`: "Reduce URL TTL for security review", `files_changed: ["config/prod.yaml"]`, rollback available to v2.1.3
- `runbooks/cdn-upload-latency.md` — "If the issue started within 6 hours of a deploy to signing-service, suspect the signed-URL TTL bug. The fix is to set `URL_TTL_SECONDS` in `signing-service/config/prod.yaml` to 3600 (was reduced to 300 in PR #4189)."

## Immediate Actions

1. **Check regional distribution**: CDN dashboard → "Uploads → POST" panel. If only one region is slow, file with CDN vendor. If all regions, proceed to step 2.
2. **Check signing-service config**: Confirm `URL_TTL_SECONDS` is currently 300 in `signing-service/config/prod.yaml`.
3. **Fix (if URL TTL is cause)**: Set `URL_TTL_SECONDS` to 3600 and redeploy `signing-service`. Rollback to v2.1.3 is also available.
4. **Confirm fix**: Upload a test image post-deploy from both iOS and Android and verify latency returns to baseline.

## Customer/Internal Update

**Draft Slack (#mobile-oncall / #uploads):**
> P2 — Image uploads degraded (30–60s) on iOS and Android, consistent since ~2026-05-18. Likely cause: signing-service URL TTL reduced to 300s in v2.1.4 (deployed 2026-05-17). Fix: bump URL_TTL_SECONDS to 3600 and redeploy. Check CDN regional panel first to rule out vendor issue. Rollback to v2.1.3 also available.

**Draft customer-facing message (if needed):**
> We are aware of slower-than-normal image upload times in the mobile app. Our team has identified the likely cause and is working on a fix. We expect to resolve this within the hour.

## Confidence

**Medium.** Symptom pattern matches the runbook precisely, and the signing-service deploy changed URL TTL. However, the 22-hour onset gap is unexplained (runbook says 6 hours) — gradual TTL expiry affecting upload queues is plausible but not confirmed. Regional CDN check and config verification should be done before applying the fix.

## Missing Data

- CDN regional breakdown not available from this routine (would confirm or rule out vendor issue).
- Current value of `URL_TTL_SECONDS` in signing-service prod config not directly readable from this repo.
- No data on whether upload failures are evenly distributed across regions or skewed.
