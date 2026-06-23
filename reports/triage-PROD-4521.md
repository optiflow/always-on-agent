# Triage Report: PROD-4521

## Decision

Treat as a P0 incident and roll back `payment-service` to `v4.8.1` while the documented null-check hotfix is staged.

## Severity

`P0`

~2,400 active checkouts are failing across `us-east-1` and `eu-west-2`, p99 on `/checkout` is up from 800ms to 8.2s, and error rate is up 340%. Per `runbooks/payment-service-degraded.md` ("All customers affected → P0") and the `AGENTS.md` severity guide (broad customer impact, payment outage).

## Likely Cause

Regression in `payment-service v4.8.2` ("Add guest checkout support"), deployed at `2026-05-19T14:04:11Z` — 14 minutes before the incident was opened at `2026-05-19T14:18:23Z`. The stack trace points to `PaymentService.processCharge(PaymentService.java:142)`, which `runbooks/payment-service-degraded.md` step 4 identifies as the known NPE where `customer.savedPaymentMethod` is null in the new guest-checkout flow.

## Evidence

- `issues/PROD-4521.json`: NPE at `PaymentService.java:142`, p99 800ms → 8.2s over 14 minutes, error rate +340%, ~2,400 active checkouts affected in `us-east-1` and `eu-west-2`, opened `2026-05-19T14:18:23Z`.
- `deploys/recent.json`: `payment-service v4.8.2` deployed `2026-05-19T14:04:11Z` (commit `9f4a1c8`, "Add guest checkout support"); changed files include `PaymentService.java` and `PaymentController.java`; `rollback_available: true`; `last_known_good: v4.8.1`.
- `runbooks/payment-service-degraded.md`: Step 1 names recent deploys as the most common cause; step 4 documents the exact `PaymentService.java:142` NPE for guest-checkout customers with null `customer.savedPaymentMethod` and prescribes a null check falling back to the request's `paymentMethodToken`; severity guide assigns `P0` when all customers are affected.

## Immediate Actions

- Roll back `payment-service` to `v4.8.1` (last known good per `deploys/recent.json`); rollback is marked available.
- Page `#payments-oncall` per the runbook P0 path.
- Stage the documented hotfix: add a null check at `PaymentService.java:142` for `customer.savedPaymentMethod`, falling back to the request's `paymentMethodToken`.
- Hold the `tenant-config-service v3.2.1` flag flip ("Enable feature flag `guest-checkout` for cohort B") until the fix ships, since the regression is in the guest-checkout path.
- Notify the deploy author (`tom.bryce@bts-synthetic.example`, commit `9f4a1c8`) once rollback completes.

## Customer/Internal Update

Draft — Slack `#payments-oncall` / status page (do not send until a human approves):

> P0 — checkout is failing for roughly 2,400 active sessions in us-east-1 and eu-west-2. p99 on /checkout jumped from 800ms to 8.2s and error rate is up 340% since 14:18 UTC. Root cause is a NullPointerException in `PaymentService.processCharge` (line 142) introduced by `payment-service v4.8.2` ("Add guest checkout support", deployed 14:04 UTC). Rolling back to v4.8.1 now and staging the documented null-check hotfix. Holding the cohort-B guest-checkout flag flip until the fix lands. Next update in 15 minutes.

## Confidence

`High`: issue stack trace, deploy timing and file list, and runbook step 4 all point to the same regression in the guest-checkout path; rollback target is known-good and available.

## Missing Data

- Live Stripe upstream status (runbook step 2) — not in repo; assumed healthy because the stack trace is an NPE in our code, not an upstream timeout.
- `payment-service` pod connection-pool metrics (runbook step 3) — not in repo; ruled less likely because the symptom is an NPE rather than pool-exhaustion timeouts.
- Per-tenant breakdown of the ~2,400 affected checkouts (e.g., whether Acme is hitting this via the cohort-B flag flip in `tenant-config-service v3.2.1`).
