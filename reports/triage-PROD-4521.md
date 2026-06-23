# Triage Report: PROD-4521

## Decision

Treat as a P0 production incident. Roll back `payment-service` to `v4.8.1`, or apply the documented null-check hotfix at `PaymentService.java:142`, before continuing investigation.

## Severity

`P0`

Broad customer impact: p99 on `/checkout` jumped from 800ms to 8.2s, error rate up 340%, ~2,400 active checkouts affected across `us-east-1` and `eu-west-2`. This is a payment-path outage, which the runbook severity guide marks `P0`.

## Likely Cause

Deploy regression that surfaces the known `NullPointerException` at `PaymentService.java:142` for customers routed through the new guest-checkout flow. `payment-service v4.8.2` ("Add guest checkout support") shipped at 14:04:11Z; the monitoring alert fired at 14:18:23Z, ~14 minutes later, and the stack trace points to the exact line called out as the unfixed known bug in the runbook.

## Evidence

- `issues/PROD-4521.json`: `java.lang.NullPointerException at com.bts.payments.PaymentService.processCharge(PaymentService.java:142)`; p99 800ms→8.2s; ~2,400 active checkouts; regions `us-east-1`, `eu-west-2`; opened 2026-05-19T14:18:23Z.
- `deploys/recent.json`: `payment-service v4.8.2`, commit `9f4a1c8`, deployed 2026-05-19T14:04:11Z, summary "Add guest checkout support", files include `PaymentService.java`, `PaymentController.java`, `CheckoutRequest.java`; `rollback_available: true`, `last_known_good: v4.8.1`.
- `runbooks/payment-service-degraded.md`: First check is recent deploys; check #4 names the known unfixed bug at `PaymentService.java:142` for the guest-checkout flow where `customer.savedPaymentMethod` is null; hotfix is a null check falling back to the request's `paymentMethodToken`.

## Immediate Actions

- Roll back `payment-service` to `v4.8.1` (rollback available per `deploys/recent.json`) — fastest path to restore checkout.
- If rollback is blocked, apply the runbook hotfix at `PaymentService.java:142`: null-check `customer.savedPaymentMethod` and fall back to `request.paymentMethodToken`.
- Page `#payments-oncall` per the runbook P0 guidance.
- Open an incident channel and assign an incident commander.
- After stabilization, file a follow-up to close the unfixed NPE bug permanently and add a regression test covering the guest-checkout path.

## Customer/Internal Update

Internal (Slack `#incidents`, draft only):
> P0 — checkout is failing for ~2,400 active sessions in us-east-1 and eu-west-2. Stack trace matches the known NPE at `PaymentService.java:142` in the guest-checkout path. `payment-service v4.8.2` deployed 14 minutes before the alert. Rolling back to `v4.8.1` (LKG) now; if rollback is blocked we will apply the runbook hotfix. IC and updates to follow.

External (status page, draft only):
> We are investigating elevated errors during checkout affecting a subset of customers. A fix is being deployed now. We will post an update within 15 minutes.

## Confidence

`High`: issue stack trace, deploy timing (14 minutes pre-alert), and runbook all align on the same root cause and the same line of code.

## Missing Data

- No confirmation that the affected checkouts are specifically on the guest-checkout flow vs. logged-in customers — the runbook ties the NPE to guest-checkout but the issue does not specify cohort.
- No current Stripe upstream status check (runbook check #2) to fully rule out a coincident upstream issue.
- No DB connection-pool metrics snapshot from the alert window (runbook check #3) to rule out a coincident pool issue.
