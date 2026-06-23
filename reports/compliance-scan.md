# Compliance Scan

## Decision

Two of three vendor contracts fail policy checks and require immediate legal and procurement review. One contract passes all checks.

- `contracts/globex-messaging.md` — **PASS** (all 7 checks)
- `contracts/acme-data-platform.md` — **FAIL** (3 violations: data residency, subprocessor notice, breach notification)
- `contracts/sirius-storage.md` — **FAIL** (7 violations: all policy checks)

## Policy Source

`compliance-policy.md` — checks: data residency, audit rights, termination, liability cap, subprocessor notice, data breach notification, governing law.

## Results

### contracts/globex-messaging.md — PASS

| Check | Result | Contract language |
|---|---|---|
| Data residency | PASS | §2: "processed exclusively within the European Economic Area (EEA). Globex will not transfer customer data outside the EEA without the customer's prior written consent." |
| Audit rights | PASS | §3: "30 days' written notice, not more than twice per calendar year." (≤90 days) |
| Termination | PASS | §4: "terminate for convenience on 60 days' written notice." (≤90 days) |
| Liability cap | PASS | §5: "capped at the fees paid in the 12 months preceding the claim." Cap does not apply to data breach, gross negligence, or wilful misconduct (i.e. uncapped for breach — favourable to us). |
| Subprocessors | PASS | §6: "at least 30 days' written notice before engaging any new subprocessor." (≥30 days advance notice) |
| Breach notification | PASS | §7: "within 24 hours of detecting a confirmed security incident." (≤72 hours) |
| Governing law | PASS | §8: "laws of England and Wales." (explicitly listed in policy) |

---

### contracts/acme-data-platform.md — FAIL

| Check | Result | Contract language | Policy requirement |
|---|---|---|---|
| Data residency | **FAIL** | §2: "Vendor may process customer data in any region where Vendor maintains infrastructure, including the United States, Ireland, and Singapore. Vendor will use reasonable efforts to keep EU data within EU regions but does not guarantee residency." | EU data must remain in EU. "Does not guarantee residency" is a violation. |
| Audit rights | PASS | §3: "not less than 60 days' written notice." (≤90 days) | |
| Termination | PASS | §4: "Termination for convenience is permitted by either party on 90 days' written notice." (exactly 90 days) | |
| Liability cap | PASS | §5: "capped at fees paid in the 12 months preceding the event." Cap does not apply to gross-negligence data breach (uncapped breach liability — favourable). | |
| Subprocessors | **FAIL** | §6: "Vendor will update the list within 30 days of any change." (retroactive 30-day notification, not advance notice) | Must notify ≥30 days **before** adding a new subprocessor. |
| Breach notification | **FAIL** | §7: "within 96 hours of confirming a security incident." (96 hours > 72-hour policy limit) | Must notify within 72 hours. |
| Governing law | Needs legal review | §8: "laws of the State of California, United States." California is not among the policy's explicitly listed jurisdictions (England & Wales, Ireland, US Delaware). CCPA/CPRA gives California strong data protection, but policy should confirm acceptability. | |

---

### contracts/sirius-storage.md — FAIL

| Check | Result | Contract language | Policy requirement |
|---|---|---|---|
| Data residency | **FAIL** | §2: "Customer data is stored in Sirius's data centres in Malaysia and Singapore." No EU data residency. Vendor may relocate data at sole discretion. | EU data must remain in EU. |
| Audit rights | **FAIL** | §3: "not less than 180 days' notice and not more than once every two years." (180 days > 90-day limit) | Must permit audit on ≤90 days' notice. |
| Termination | **FAIL** | §4: "Termination for convenience is not permitted during the initial term." Initial term is 5 years. | Must be able to terminate for convenience with ≤90 days' notice. |
| Liability cap | **FAIL** | §5: "capped at three (3) months of fees paid. This cap applies to all claims, including those arising from data breach or loss." (3 months < 12-month minimum; cap explicitly applies to data breach) | Cap must be ≥12 months; violation if cap excludes data breach scenarios — here cap is also too low. |
| Subprocessors | **FAIL** | §6: "Sirius may engage any subprocessor it deems appropriate without prior notice to or consent from the customer." (no notice at all) | Must notify ≥30 days in advance. |
| Breach notification | **FAIL** | §7: "Sirius will notify the customer of confirmed security incidents in due course, taking into account the nature and circumstances of the incident." (no specific time window) | Must notify within 72 hours. |
| Governing law | **FAIL** | §8: "laws of Malaysia." Malaysia does not have a recognised data protection regime equivalent to the jurisdictions listed in policy. | Must be a jurisdiction with mature data protection law. |

## Evidence

- `compliance-policy.md` — policy source for all seven checks
- `contracts/globex-messaging.md` — contract reviewed, effective 2026-01-15
- `contracts/acme-data-platform.md` — contract reviewed, effective 2025-09-01
- `contracts/sirius-storage.md` — contract reviewed, effective 2025-11-12

## Immediate Actions

### Acme Data Platform Ltd.
1. **Legal review now:** Escalate data residency (§2), subprocessor notice (§6), and breach notification (§7) to legal and procurement.
2. **Negotiate amendments:** Require (a) EU data residency guarantee, (b) 30-day advance subprocessor notice, (c) 72-hour breach notification window.
3. **Governing law:** Request legal opinion on whether California qualifies as equivalent to the listed jurisdictions before next renewal.

### Sirius Storage SDN BHD
1. **Escalate immediately to legal and procurement** — all seven policy checks fail. This contract presents the highest compliance risk in the portfolio.
2. **Do not renew** without full renegotiation. Initial 5-year term with no termination-for-convenience right and a 365-day non-renewal notice window means action is time-sensitive.
3. **Assess EU data exposure:** Determine whether any EU customer data is currently stored with Sirius. If yes, initiate data migration planning.
4. **Negotiate or exit:** Priority amendments required on data residency, audit rights, termination, liability cap, subprocessors, breach notification, and governing law.

**Draft Slack for #legal-ops:**
> COMPLIANCE ALERT — Vendor contract scan complete. `sirius-storage.md` fails all 7 policy checks including no EU data residency, no termination for convenience, 3-month liability cap (policy: 12 months), no subprocessor notice, and no breach notification SLA. `acme-data-platform.md` fails 3 checks (data residency, subprocessor notice, breach notification window 96h vs 72h required). `globex-messaging.md` passes all checks. Recommend immediate legal and procurement review for Sirius and Acme. Full report at reports/compliance-scan.md.

## Confidence

**High.** Policy language and contract clauses are unambiguous for the failing checks. The only item requiring judgement is Acme's California governing law (marked `needs legal review`). All other pass/fail determinations are based on explicit clause-to-policy comparisons.

## Missing Data

- Legal opinion on whether California governing law satisfies the policy's "mature data protection law" standard (affects Acme Data Platform).
- Whether EU customer data is currently stored with Sirius Storage — this is the highest-priority unknown given the data residency failure.
- Upcoming renewal dates for Acme and Sirius contracts — relevant to determining urgency of renegotiation.
