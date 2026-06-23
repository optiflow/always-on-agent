# Triage Report: PROD-4498

## Decision

Treat as a P2 incident with a high-confidence known cause from the runbook. Confirm the pool-exhaustion signal on an auth-service pod, then bump `DB_POOL_SIZE` from 30 to 60.

## Severity

`P2`

Intermittent production impact with a known next diagnostic step. Each 502 window is 25-35s and self-resolves; no broad outage. The runbook documents this exact pattern.

## Likely Cause

Connection pool exhaustion on the `auth-service` → `users-db` link during load spikes. The bcrypt hash check holds DB connections long enough that bursts of `/auth/login` drain the pool faster than it refills, producing 20-60s 502 windows that clear when traffic subsides. The runbook identifies this as the cause "95% of the time" for this symptom signature. No deploy in the relevant window — consistent with a load-driven, not regression-driven, cause.

## Evidence

- `issues/PROD-4498.json`: 3 separate 502 windows on `POST /auth/login` in 24h, each 25-35s; no deploys in the windows; no pod restarts; load balancer logs show upstream timeouts; reporter explicitly hypothesizes connection pool exhaustion.
- `runbooks/auth-502-windows.md`: Symptom list matches exactly (bursts of 502 on `POST /auth/login`, 20-60s, no related deploys, upstream timeouts in LB logs). Documents root cause as auth-service → users-db pool exhaustion under bcrypt-bound load. Fix: bump `DB_POOL_SIZE` 30→60 in `auth-service/config/prod.yaml` and redeploy.
- `deploys/recent.json`: Most recent `auth-service` deploy is `v6.0.0` on 2026-05-14T08:15:42Z ("switch session storage to Redis"). That predates the 502 windows reported on 2026-05-12 by … actually the deploy is after the issue (issue opened 2026-05-12T22:14:55Z, deploy 2026-05-14T08:15:42Z), and the issue body says "no deploys in the relevant time windows," confirming this incident is not a deploy regression.

## Immediate Actions

- Confirm the cause per runbook step 1: SSH to an `auth-service` pod and run `curl localhost:9090/metrics | grep db_pool`. If `db_pool_idle` is 0 during a 502 window, the runbook's diagnosis is confirmed.
- If confirmed, apply the runbook short-term fix: bump `DB_POOL_SIZE` in `auth-service/config/prod.yaml` from 30 to 60 and redeploy.
- Do NOT scale `auth-service` pods (the runbook warns this worsens pool drain on the same DB).
- Do NOT raise the load balancer timeout (the runbook warns this hides the symptom).
- Track the long-term fix (argon2id migration) under PROD-4221 as the runbook indicates.

## Customer/Internal Update

Internal Slack `#auth-oncall` (draft only):
> P2 — three 25-35s 502 windows on `POST /auth/login` in the last 24h, no deploys in window. Symptoms match `runbooks/auth-502-windows.md` exactly (95% cause: DB pool exhaustion under bcrypt load). Plan: confirm `db_pool_idle=0` on an auth pod, then bump `DB_POOL_SIZE` 30→60 and redeploy. Not scaling pods, not touching LB timeout per runbook.

Customer-facing: no external update needed; impact is intermittent and self-recovering, and no customer complaints are recorded in the issue.

## Confidence

`Medium`: symptom pattern, runbook, and absence of deploy correlation align tightly on a single cause, but the runbook step-1 metric check (`db_pool_idle=0` during a 502 window) has not been performed against repo evidence. The fix should not be applied until that check confirms the diagnosis.

## Missing Data

- `db_pool_idle` metric snapshots from `auth-service` pods during the 502 windows — required by the runbook before applying the fix.
- Per-window timestamps for the three 502 windows (the issue cites "the last 24 hours" but not exact start/stop times), which would be needed to correlate with traffic spikes.
- Concurrent traffic levels on `POST /auth/login` during each window to confirm a load-spike pattern.
