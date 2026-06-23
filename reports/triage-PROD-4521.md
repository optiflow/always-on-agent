# Triage Report: PROD-4521

## Decision

Active incident. Rollback `payment-service` to `v4.8.1` immediately and apply the null-check hotfix before re-deploying `v4.8.2`.

## Severity

**P0** — ~2,400 active checkouts affected across us-east-1 and eu-west-2. Error rate up 340%, p99 latency at 8.2s (baseline 800ms). All customers who enter the guest checkout flow are hitting this.

## Likely Cause

`payment-service v4.8.2` (deployed 2026-05-19T14:04:11Z, 14 minutes before the alert) introduced guest checkout support and changed `PaymentService.java`. The NPE at `PaymentService.java:142` is the known bug described in `runbooks/payment-service-degraded.md`: `customer.savedPaymentMethod` is null for users in the guest checkout flow, and there is no null guard at line 142. The rollback-available flag is `true` and the last known good version is `v4.8.1`.

## Evidence

- `issues/PROD-4521.json` — stack trace confirms `PaymentService.java:142`; 2,400 active sessions affected; alert opened 2026-05-19T14:18:23Z
- `deploys/recent.json` — `payment-service v4.8.2` deployed 2026-05-19T14:04:11Z by tom.bryce@bts-synthetic.example; changed `PaymentService.java`, `PaymentController.java`, `CheckoutRequest.java`; rollback available to `v4.8.1`
- `runbooks/payment-service-degraded.md` — documents the exact NPE at line 142 as the guest checkout null-payment-method bug; recommends null check with fallback to `paymentMethodToken`

## Immediate Actions

1. **Now:** Roll back `payment-service` to `v4.8.1` to restore checkout. Command: trigger rollback to `last_known_good: v4.8.1` (tom.bryce or on-call to execute).
2. **Now:** Page `#payments-oncall` — P0 severity.
3. **Before re-deploy:** Add null check at `PaymentService.java:142`: if `customer.savedPaymentMethod == null`, fall back to `request.paymentMethodToken`.
4. **Check:** Verify Stripe upstream status (status.stripe.com) to rule out a concurrent Stripe incident before rollback.

## Customer/Internal Update

**Draft Slack message for #payments-oncall:**
> P0 INCIDENT — payment-service NPE at PaymentService.java:142. ~2,400 active checkouts failing in us-east-1 + eu-west-2. Root cause: guest checkout null payment method in v4.8.2 (deployed 14:04 UTC). Rolling back to v4.8.1. ETA to restoration: TBD. [PROD-4521]

**Draft status page update:**
> We are investigating elevated error rates on our checkout service. Customers may be unable to complete purchases. Our team has identified the cause and a fix is in progress. We will update in 15 minutes.

## Confidence

**High.** Deploy-to-incident gap is 14 minutes. Stack trace matches the exact bug documented in the runbook. Rollback is available. The only open question is whether Stripe is concurrently degraded (check status.stripe.com before rollback to avoid a misleading "fix").

## Missing Data

- Stripe upstream status (status.stripe.com) — not checked, cannot rule out concurrent third-party degradation.
- `payment-service` pod metrics (connection pool) — not available in repo files; runbook step 3 should be verified in parallel with rollback.
- Exact count of failed transactions and whether they need to be retried or refunded.
