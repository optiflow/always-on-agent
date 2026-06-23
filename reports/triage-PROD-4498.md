# Triage Report: PROD-4498

## Decision

Production incident, not a false alarm. The `auth-service` connection pool is exhausting under load spikes. Bump `DB_POOL_SIZE` from 30 to 60 in `auth-service/config/prod.yaml` and redeploy.

## Severity

**P2** — Intermittent, self-resolving 502 windows (25-35 seconds each, 3 occurrences in 24 hours). No sustained outage. Known root cause with a documented fix. No current escalation required; on-call engineer should schedule the config change within normal business hours unless the frequency increases.

## Likely Cause

Connection pool exhaustion on the `auth-service → users-db` link. The `auth-service` holds connections for the duration of bcrypt hash verification (intentionally slow). Under load spikes, the pool drains faster than connections are returned, causing the load balancer to see upstream timeouts and return 502s. The windows resolve when in-flight logins complete and connections are returned to the pool. The `auth-service v6.0.0` deploy (2026-05-14, switched session storage to Redis) may have changed connection lifecycle behaviour, but it predates the issue by two days — monitoring may simply have not caught earlier windows.

## Evidence

- `issues/PROD-4498.json` — 3 × 502 windows on `POST /auth/login`, each 25-35 seconds, self-resolving; load balancer shows upstream timeouts; no pod restarts; opened 2026-05-12T22:14:55Z
- `deploys/recent.json` — `auth-service v6.0.0` deployed 2026-05-14T08:15:42Z (after issue opened); no deploy to auth-service in the windows described in the issue; no rollback available for `v6.0.0`
- `runbooks/auth-502-windows.md` — connection pool exhaustion (`auth-service → users-db`) confirmed as 95% root cause; symptoms match exactly; fix: bump `DB_POOL_SIZE` to 60 in `auth-service/config/prod.yaml`

## Immediate Actions

1. **Verify during next 502 window:** SSH to an `auth-service` pod and run `curl localhost:9090/metrics | grep db_pool`. If `db_pool_idle` is 0, pool exhaustion is confirmed.
2. **Fix:** Set `DB_POOL_SIZE=60` in `auth-service/config/prod.yaml` and redeploy.
3. **Do not** scale up `auth-service` pods — more pods drain the same database pool faster (per runbook).
4. **Do not** increase load balancer timeout — hides the symptom without fixing the cause.
5. **Long-term:** Switch to argon2id (tracked in PROD-4221) to reduce connection hold time.

## Customer/Internal Update

**Draft Slack for #infra-oncall:**
> P2 — auth-service intermittent 502 windows on POST /auth/login (3 × ~30s in last 24h). Likely connection pool exhaustion (db_pool_idle → 0 under load). Fix: bump DB_POOL_SIZE from 30 to 60 in auth-service/config/prod.yaml and redeploy. Please verify with metrics during next window before applying. [PROD-4498]

## Confidence

**Medium-High.** Symptoms match the runbook pattern exactly (upstream timeouts, no pod restarts, self-resolving). No deploy in the incident windows. However, pool exhaustion has not been confirmed with live metrics (`db_pool_idle` check not yet run) — this is the missing verification step.

## Missing Data

- Live `db_pool_idle` metric from `auth-service` pods during a 502 window — this is the single verification step before applying the fix.
- Whether `auth-service v6.0.0` (Redis session storage migration) changed the connection pool configuration or lifecycle; no rollback available for this version.
- 24-hour frequency trend — 3 windows in 24 hours may be increasing; if frequency rises, escalate to P1.
