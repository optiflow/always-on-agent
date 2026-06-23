# Triage Report: PROD-4498

## Decision

**Incident — Intermittent, not actively down.** Recurring 502 windows on `POST /auth/login` are consistent with connection pool exhaustion on the `auth-service → users-db` link. Requires a config change and redeploy; no rollback target available for `auth-service v6.0.0`.

## Severity

**P2** — Intermittent 25–35 second 502 windows, self-resolving. Not a sustained outage. Known next diagnostic and fix step exists.

## Likely Cause

The `auth-service v6.0.0` deploy on 2026-05-14 switched session storage to Redis (major change). The 502 windows began surfacing around 2026-05-12 (pre-deploy based on issue date), and continue with no further deploys in the windows. The `runbooks/auth-502-windows.md` identifies connection pool exhaustion on `auth-service → users-db` as the cause in 95% of cases: bcrypt hash checks hold connections for their full duration, draining the pool under load spikes. Load balancer logs showing upstream timeouts (per issue body) match this runbook pattern exactly.

Note: The issue was opened 2026-05-12, two days before the auth-service v6.0.0 deploy (2026-05-14). The 502 windows may predate the Redis migration; the Redis migration may have changed pool behavior. Causal relationship with the deploy is uncertain.

## Evidence

- `issues/PROD-4498.json` — 3 separate 502 windows in 24 hours, 25–35 seconds each, self-resolving; no deploys in relevant windows; load balancer shows upstream timeouts; auth pods show no restarts
- `deploys/recent.json` — `auth-service v6.0.0` at `2026-05-14T08:15:42Z`, "Major: switch session storage to Redis"; **rollback not available** (last_known_good v5.9.7)
- `runbooks/auth-502-windows.md` — Connection pool exhaustion on auth→users-db; fix is to bump `DB_POOL_SIZE` from 30 to 60 in `auth-service/config/prod.yaml`; do not scale pods (worsens the problem)

## Immediate Actions

1. **Diagnose first**: SSH to an `auth-service` pod and run `curl localhost:9090/metrics | grep db_pool`. Check `db_pool_idle` during or after a 502 window. If it reaches 0, pool exhaustion is confirmed.
2. **Short-term fix (if confirmed)**: Bump `DB_POOL_SIZE` from 30 to 60 in `auth-service/config/prod.yaml` and redeploy. Do **not** scale up pods (per runbook).
3. **Do not roll back auth-service**: No rollback is available (`rollback_available: false`).
4. **Long-term**: Track argon2id migration (PROD-4221) to reduce bcrypt hold time.

## Customer/Internal Update

**Draft Slack (#auth-oncall):**
> P2 — Intermittent 502s on /auth/login (3 windows in 24h, ~30s each, self-resolving). Pattern matches connection pool exhaustion. No rollback available on auth-service v6.0.0. Recommend: SSH to pod → check db_pool_idle → bump DB_POOL_SIZE to 60 and redeploy if confirmed. No customer-facing message needed yet (impact is transient).

## Confidence

**Medium.** Symptom and runbook match well, but the issue predates the auth-service deploy and no live pool metrics have been observed. Confirmation step (pod SSH + metrics) is required before the fix.

## Missing Data

- Live `db_pool_idle` metrics during a 502 window not available from this routine.
- Uncertain whether the v6.0.0 Redis migration changed connection pool configuration or sizing.
- No data on whether 502 windows have increased in frequency since v6.0.0 deploy (would strengthen causal link).
