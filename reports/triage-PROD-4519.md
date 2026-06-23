# Triage Report: PROD-4519

## Decision

Production incident. The `signing-service v2.1.4` deploy (2026-05-17) reduced `URL_TTL_SECONDS` and is the likely cause of consistent upload latency. Set `URL_TTL_SECONDS=3600` in `signing-service/config/prod.yaml` and redeploy to restore normal upload performance.

## Severity

**P2** — Consistent customer-facing degradation (30-60s upload times) on iOS and Android for product photo uploads. No data loss. Checkout and payment paths are unaffected. Known next diagnostic step available.

## Likely Cause

`signing-service v2.1.4` deployed 2026-05-17T11:22:00Z reduced the pre-signed URL TTL ("Reduce URL TTL for security review"). The runbook documents that reducing `URL_TTL_SECONDS` causes uploads to stall while waiting for signature re-validation; the fix is to restore it to 3600 seconds. The initial intermittent reports (2 days before the issue, ~2026-05-16) may have been a separate regional ISP routing issue, or the reporter's timeline may be approximate. The consistent degradation across iOS and Android starting after the deploy points to the TTL as the dominant cause of the current persistent issue. CDN metrics showing normal traffic (no CDN-side anomaly) are consistent with the runbook's pre-signed URL path.

## Evidence

- `issues/PROD-4519.json` — 30-60s upload times on `POST /uploads/images`, both iOS and Android; CDN dashboard normal; backend logs show no errors but latency tripled; started intermittently ~2026-05-16, now consistent; opened 2026-05-18T09:42:11Z
- `deploys/recent.json` — `signing-service v2.1.4` deployed 2026-05-17T11:22:00Z, "Reduce URL TTL for security review"; changed `config/prod.yaml`; rollback available to `v2.1.3`
- `runbooks/cdn-upload-latency.md` — documents pre-signed URL TTL bug (URL_TTL_SECONDS reduced to 300 in PR #4189); fix: set `URL_TTL_SECONDS=3600` in `signing-service/config/prod.yaml`; CDN dashboard appearing normal is consistent with this cause

## Immediate Actions

1. **Option A (fastest):** Set `URL_TTL_SECONDS=3600` in `signing-service/config/prod.yaml` and redeploy.
2. **Option B:** Roll back `signing-service` to `v2.1.3` (rollback available) if the config change cannot be reviewed quickly.
3. **Verify:** Spot-check upload latency on `POST /uploads/images` after the change; confirm CDN dashboard remains clean.
4. **If still degraded after fix:** Check CDN dashboard upload latency by region to rule out a regional ISP routing issue (per runbook).

## Customer/Internal Update

**Draft Slack for #mobile-infra-oncall:**
> P2 — product photo uploads taking 30-60s consistently on iOS and Android since ~2026-05-17. Suspected cause: signing-service v2.1.4 reduced URL_TTL_SECONDS. Fix: restore URL_TTL_SECONDS=3600 in signing-service/config/prod.yaml and redeploy (or roll back to v2.1.3). Assigning to signing-service owner. [PROD-4519]

**Draft customer-support reply:**
> We are aware of slow image upload times in the mobile app and are actively working on a fix. We expect to resolve this within the next few hours. We apologise for the inconvenience and will update you once the fix is deployed.

## Confidence

**Medium.** The symptom pattern matches the runbook exactly (CDN normal, backend latency elevated on uploads, deploy to signing-service). However, the reporter states uploads were intermittently slow before the signing-service deploy, which slightly weakens the causal link. The persistent degradation after the deploy is strong circumstantial evidence. If the fix does not resolve the issue, the regional CDN path check is the next step.

## Missing Data

- CDN dashboard upload latency broken down by region — would confirm whether the issue is global (TTL) or regional (ISP routing).
- Exact value of `URL_TTL_SECONDS` currently in `signing-service/config/prod.yaml` (not readable from repo files).
- Whether the security review that motivated the TTL reduction is still ongoing and would block restoring 3600s.
