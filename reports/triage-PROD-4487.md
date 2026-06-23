# Triage Report: PROD-4487

## Decision

Active incident. Disable the `guest-checkout` feature flag for Acme Corp (cohort B) immediately. Root cause is the same NPE as PROD-4521, triggered by the `tenant-config-service` flag rollout.

## Severity

**P1** — Tenant-specific. Acme Corp (2,400 seats) cannot complete checkout. Other tenants are unaffected. Acme CTO is in a call with CSM within 25 minutes of report time.

## Likely Cause

`tenant-config-service v3.2.1` deployed at 2026-05-20T07:12:08Z enabled the `guest-checkout` feature flag for cohort B, which includes Acme Corp. This exposed Acme's users to the NPE at `PaymentService.java:142` (null `savedPaymentMethod` for guest checkout flow) — the same bug at the root of PROD-4521. The frontend deploy at 06:50:33Z (`v12.4.1`, pricing page copy) is unrelated.

## Evidence

- `issues/PROD-4487.json` — Acme Corp, 2,400 users, checkout fails as of 07:25 UTC; issue opened 07:33 UTC; tenant-specific
- `deploys/recent.json` — `tenant-config-service v3.2.1` deployed 2026-05-20T07:12:08Z, "Enable feature flag 'guest-checkout' for cohort B (Acme Corp included)"; rollback available to `v3.2.0`
- `deploys/recent.json` — `frontend v12.4.1` deployed 2026-05-20T06:50:33Z (pricing page copy only; not related to checkout logic)
- `runbooks/payment-service-degraded.md` — NPE at `PaymentService.java:142` is the documented guest-checkout null payment method bug; one-tenant impact → P1
- `reports/triage-PROD-4521.md` — PROD-4521 established the same NPE and linked it to payment-service v4.8.2; PROD-4487 is a recurrence triggered by the flag enabling the same code path for Acme

## Immediate Actions

1. **Now:** Roll back `tenant-config-service` to `v3.2.0` (or disable `guest-checkout` flag for cohort B) to restore Acme checkout. Rollback available.
2. **Now:** Notify CSM so they can update Acme CTO — see draft below.
3. **If PROD-4521 hotfix is not yet in place:** Do not re-enable the flag until `PaymentService.java:142` null check is deployed.
4. **Verify:** Confirm Acme users can complete checkout after flag rollback.

## Customer/Internal Update

**Draft for CSM to relay to Acme CTO:**
> We have identified the root cause of the checkout issue affecting Acme Corp. A recently enabled feature introduced a defect in our payment processing path. We have rolled back that feature for your account and checkout should be restored within the next few minutes. We are working on a permanent fix and will confirm once it is deployed. We apologise for the disruption.

**Draft Slack for #customer-success and #payments-oncall:**
> P1 INCIDENT — Acme Corp (2,400 users) checkout broken since 07:25 UTC. Caused by guest-checkout flag enabled in tenant-config-service v3.2.1 (07:12 UTC). Same NPE as PROD-4521 (PaymentService.java:142). Rolled back tenant-config to v3.2.0. CSM please update Acme CTO on the call now. [PROD-4487]

## Confidence

**High.** Deploy timing is tight (flag enabled 07:12, outage starts 07:25, 13-minute gap). Symptom (spinner on payment confirmation) matches the NPE causing checkout to hang. Rollback is available. No evidence implicates any other recent change.

## Missing Data

- Confirmation that PROD-4521 hotfix (`PaymentService.java:142` null check) has been merged before the flag is re-enabled.
- Whether any other cohorts beyond cohort B were scheduled for the `guest-checkout` flag rollout.
