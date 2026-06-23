import { describe, expect, it } from "vitest";
import { runAgent } from "./agent.js";
import { maybePolishRunWithClaude } from "./claude.js";
import { createStarterData } from "./data.js";

const run = runAgent(createStarterData(), { now: "2026-05-20T08:00:00Z" });

describe("runAgent", () => {
  it("ranks the payment checkout incident first with deploy and runbook evidence", () => {
    const first = run.incidents[0];

    expect(first?.issue.id).toBe("PROD-4521");
    expect(first?.severity).toBe("P0");
    expect(first?.evidence.some((item) => item.title.includes("payment-service v4.8.2"))).toBe(
      true,
    );
    expect(first?.evidence.some((item) => item.detail.includes("PaymentService.java:142"))).toBe(
      true,
    );
  });

  it("links Acme checkout failure to the guest-checkout tenant flag", () => {
    const finding = run.incidents.find((item) => item.issue.id === "PROD-4487");

    expect(finding?.severity).toBe("P1");
    expect(finding?.hypothesis).toContain("guest-checkout");
    expect(finding?.evidence.some((item) => item.detail.includes("Acme Corp"))).toBe(true);
  });

  it("classifies worker pool parallel jobs as feature work", () => {
    const finding = run.incidents.find((item) => item.issue.id === "PROD-4506");

    expect(finding?.classification).toBe("feature");
    expect(finding?.severity).toBe("feature");
    expect(finding?.rankScore).toBeLessThan(10);
  });

  it("finds Acme and Sirius compliance drift while Globex passes", () => {
    const acme = run.compliance.find((item) => item.contractId === "acme-data-platform");
    const globex = run.compliance.find((item) => item.contractId === "globex-messaging");
    const sirius = run.compliance.find((item) => item.contractId === "sirius-storage");

    expect(acme?.status).toBe("fail");
    expect(acme?.violationCount).toBeGreaterThan(0);
    expect(globex?.status).toBe("pass");
    expect(globex?.violationCount).toBe(0);
    expect(sirius?.status).toBe("fail");
    expect(sirius?.violationCount).toBeGreaterThan(acme?.violationCount ?? 0);
  });

  it("keeps the deterministic run when no Claude key is available", async () => {
    await expect(maybePolishRunWithClaude(run, { apiKey: "" })).resolves.toBe(run);
  });
});
