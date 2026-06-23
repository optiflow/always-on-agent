# Triage Report: PROD-4487

## Decision

**Incident — Active.** Acme Corp (2,400 seats) cannot complete checkout. The `tenant-config-service v3.2.1` deploy at 07:12 UTC enabled the `guest-checkout` feature flag for cohort B (which includes Acme Corp), exposing Acme users to the known NPE bug in `payment-service v4.8.2`. This is tenant-specific because Acme is in the flag cohort and other tenants are not.

## Severity

**P1** — Single enterprise tenant fully unable to transact; CTO escalation in progress. Page CSM and on-call.

## Likely Cause

Two deploys created the conditions for this failure:

1. `payment-service v4.8.2` (2026-05-19 14:04 UTC) introduced a known NPE at `PaymentService.java:142` in the guest checkout flow.
2. `tenant-config-service v3.2.1` (2026-05-20 07:12 UTC) enabled feature flag `guest-checkout` for cohort B, which explicitly includes Acme Corp.

Acme users began reporting failures at ~07:25 UTC, 13 minutes after the flag was toggled. No other tenants appear affected because they are not in cohort B.

## Evidence

- `issues/PROD-4487.json` — Acme Corp (2,400 seats), checkout spinner unresolved since ~07:25 UTC, tenant-specific, CTO escalation via CSM
- `deploys/recent.json` — `tenant-config-service v3.2.1` at `2026-05-20T07:12:08Z`: "Enable feature flag 'guest-checkout' for cohort B (Acme Corp included)", rollback available to v3.2.0
- `deploys/recent.json` — `payment-service v4.8.2` at `2026-05-19T14:04:11Z`: "Add guest checkout support", rollback available to v4.8.1
- `runbooks/payment-service-degraded.md` — NPE at `PaymentService.java:142` is the known guest checkout null-safety bug; tenant-specific impact → P1

## Immediate Actions

1. **Fastest fix**: Roll back `tenant-config-service` to v3.2.0 to disable the `guest-checkout` flag for cohort B. This restores Acme immediately without touching payment-service.
2. **If payment-service rollback is already in progress for PROD-4521**: that rollback also resolves this issue; monitor Acme recovery.
3. **Page on-call and CSM**: Inform CSM before the Acme CTO call (scheduled ~07:58 UTC). Acme should see recovery within minutes of either rollback.
4. **Post-fix**: Do not re-enable `guest-checkout` flag for cohort B until `PaymentService.java:142` null-safety hotfix is confirmed deployed.

## Customer/Internal Update

**Draft Slack (#oncall / #customer-success):**
> P1 INCIDENT — Acme Corp checkout broken. Root cause: guest-checkout feature flag (tenant-config-service v3.2.1, 07:12 UTC) enabled for cohort B, exposing Acme to payment-service NPE bug (v4.8.2). Rolling back flag now. ETA recovery: ~5 min. CSM: prep Acme CTO update.

**Draft customer message (for CSM to relay to Acme CTO):**
> We've identified the root cause of the checkout issue affecting your account. A configuration change made this morning enabled a new payment flow for your tenant that exposed a known software defect. We are rolling back that configuration now and expect full checkout functionality to be restored within the next 5 minutes. We will follow up with a written incident summary within 2 hours.

## Confidence

**High.** Deploy-to-symptom gap is 13 minutes, the cohort B flag explicitly names Acme Corp, and the underlying NPE mechanism is well-documented in the runbook.

## Missing Data

- No confirmation that Acme is exclusively in the guest-checkout flow (vs. mixed guest/authenticated). If some Acme users authenticate, they may not be hitting the NPE.
- Post-rollback recovery confirmation not yet available.
- No data on whether other cohort B tenants (beyond Acme) are also affected but have not yet reported.
