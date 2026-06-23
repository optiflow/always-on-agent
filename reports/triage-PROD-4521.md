# Triage Report: PROD-4521

## Decision

**Incident — Active.** The NPE in `PaymentService.java:142` is causing a live payment outage affecting ~2,400 active checkouts across us-east-1 and eu-west-2. Recommend immediate rollback of `payment-service` to v4.8.1.

## Severity

**P0** — Broad customer impact, payment outage. Page `#payments-oncall` immediately.

## Likely Cause

The `payment-service v4.8.2` deploy at 14:04 UTC added guest checkout support. The incident opened 14 minutes later at 14:18 UTC with the exact stack trace called out in `runbooks/payment-service-degraded.md`: `NullPointerException` at `PaymentService.java:142`. The runbook identifies this as a known bug where `customer.savedPaymentMethod` is null for customers in the guest checkout flow. The deploy's `files_changed` includes `PaymentService.java`, `PaymentController.java`, and `CheckoutRequest.java`, confirming the regression origin.

## Evidence

- `issues/PROD-4521.json` — stack trace: `PaymentService.processCharge(PaymentService.java:142)`, p99 8.2s, error rate +340%, ~2,400 active checkouts, regions us-east-1 / eu-west-2
- `deploys/recent.json` — `payment-service v4.8.2` deployed at `2026-05-19T14:04:11Z` by tom.bryce@bts-synthetic.example, summary: "Add guest checkout support", rollback available to v4.8.1
- `runbooks/payment-service-degraded.md` — "If the stack trace shows `PaymentService.java:142`, this is the unfixed bug where `customer.savedPaymentMethod` is null for customers in the new 'guest checkout' flow."

## Immediate Actions

1. **Rollback now**: `payment-service` v4.8.2 → v4.8.1 (rollback available per deploy record). Notify tom.bryce@bts-synthetic.example.
2. **Page on-call**: Alert `#payments-oncall` with P0 designation.
3. **Verify recovery**: Confirm p99 latency and error rate return to baseline after rollback.
4. **Hotfix path (if rollback not possible)**: Add null check at `PaymentService.java:142`, falling back to `request.paymentMethodToken`.
5. **Check Stripe status**: Rule out concurrent Stripe degradation as a compounding factor (per runbook step 2).

## Customer/Internal Update

**Draft Slack (#payments-oncall):**
> P0 INCIDENT — Payment service is actively degraded. ~2,400 checkouts failing with NPE in PaymentService (guest checkout regression in v4.8.2 deployed 14:04 UTC). Rolling back to v4.8.1. ETA 5 min. Page @oncall-lead.

**Draft GitHub comment (PROD-4521):**
> Root cause identified: deploy regression in payment-service v4.8.2 (guest checkout feature, 14:04 UTC). NPE at PaymentService.java:142 — null savedPaymentMethod for guest checkout users. Initiating rollback to v4.8.1. Updates to follow.

## Confidence

**High.** The deploy timestamp precedes incident onset by 14 minutes, the stack trace matches the runbook's named bug exactly, and a rollback target is available.

## Missing Data

- Live Stripe status not checked (no external access from this routine).
- No pod-level metrics to confirm database connection pool health as a secondary factor.
- Post-rollback confirmation of recovery not yet available.
