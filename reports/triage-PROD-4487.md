# Triage Report: PROD-4487

## Decision

Treat as a P1 tenant-specific incident driven by the same guest-checkout NPE behind PROD-4521. Disable the `guest-checkout` feature flag for cohort B (Acme) immediately, or roll back `tenant-config-service` to `v3.2.0`.

## Severity

`P1`

Tenant-specific customer impact at an enterprise account (Acme Corp, 2,400 seats). Per the payment-service runbook severity guide, "one tenant affected → P1". CSM has an Acme CTO call in 25 minutes, so escalation risk is high.

## Likely Cause

`tenant-config-service v3.2.1` deployed at 07:12:08Z enabled the `guest-checkout` feature flag for cohort B, which includes Acme Corp. Acme users then routed through the guest-checkout code path and hit the known `NullPointerException` at `PaymentService.java:142` documented in the payment runbook. Acme reports started at 07:25 UTC, ~13 minutes after the flag flip — consistent with rollout propagation. The spinner that never resolves matches a hung payment confirmation step.

## Evidence

- `issues/PROD-4487.json`: Acme Corp (2,400 users) cannot complete checkout as of 07:25 UTC; spinner never resolves on payment confirmation; appears tenant-specific; CSM/CTO call imminent; label `customer-impact`.
- `deploys/recent.json`: `tenant-config-service v3.2.1`, commit `1c4b9a2`, deployed 2026-05-20T07:12:08Z, summary "Enable feature flag 'guest-checkout' for cohort B (Acme Corp included)"; `rollback_available: true`, `last_known_good: v3.2.0`.
- `issues/PROD-4521.json`: Open NPE in `PaymentService.processCharge` at `PaymentService.java:142` — the same failure mode customers in guest-checkout will see.
- `runbooks/payment-service-degraded.md`: Names `PaymentService.java:142` as the unfixed NPE in the new guest-checkout flow, exactly the cohort Acme was just added to.

## Immediate Actions

- Disable the `guest-checkout` feature flag for cohort B in `tenant-config-service` (or roll back to `v3.2.0`) so Acme users stop routing through the broken path. This is reversible and unblocks Acme without waiting on the payment-service fix.
- If PROD-4521 is being resolved by rolling back `payment-service` to `v4.8.1` or applying the `PaymentService.java:142` null-check hotfix, that change also fixes this incident — coordinate with the PROD-4521 IC.
- Brief the CSM before the Acme CTO call with a short, factual status (template in "Customer/Internal Update" below).
- After stabilization, decouple cohort feature-flag rollouts from any feature that has an open `P1`-or-higher bug against it.

## Customer/Internal Update

Acme CSM brief (draft only):
> Acme's checkout failures started at 07:25 UTC, ~13 minutes after we enabled the `guest-checkout` feature for the cohort Acme belongs to. The guest-checkout path has a known bug we are fixing (PROD-4521). To unblock Acme, we are disabling the feature for their cohort now; their checkout should recover within minutes. We will follow up with a written incident summary once we confirm recovery.

Internal Slack `#cs-incidents` (draft only):
> P1 — Acme (2,400 seats) cannot check out since 07:25 UTC. Cause: cohort B `guest-checkout` flag enabled at 07:12 UTC routed Acme users into the known NPE at `PaymentService.java:142` (PROD-4521). Rolling back `tenant-config-service v3.2.1 → v3.2.0` to disable the flag for cohort B. CSM briefed for 07:50 UTC CTO call.

## Confidence

`High`: deploy timing (Acme onset 13 minutes after cohort-B flag enable), tenant scope (Acme listed in cohort B per the deploy summary), and failure mode (payment confirmation spinner aligns with NPE in `processCharge`) all line up. The link to PROD-4521 is the same `PaymentService.java:142` path called out in the runbook.

## Missing Data

- No direct stack trace or log line from an Acme request confirming the NPE — inferred from the deploy summary and the open bug, not from a server log in this repo.
- The cohort B definition in `feature-flags/cohort-b.yaml` is referenced in `deploys/recent.json` but not present in the repo for independent verification of Acme's membership.
- No Acme-specific error-rate metric to confirm 100% checkout failure vs. partial.
