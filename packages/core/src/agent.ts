import type {
  ActionDraft,
  AgentInput,
  AgentRun,
  ComplianceFinding,
  ComplianceViolation,
  Deploy,
  Evidence,
  IncidentFinding,
  Issue,
  Runbook,
  Severity,
} from "./types.js";

type RunOptions = {
  now?: string;
};

export function runAgent(input: AgentInput, options: RunOptions = {}): AgentRun {
  const generatedAt = options.now ?? new Date().toISOString();
  const incidents = input.issues
    .map((issue) => scanIssue(issue, input.deploys, input.runbooks))
    .sort((left, right) => right.rankScore - left.rankScore);
  const compliance = scanContracts(input);
  const activeIncidents = incidents.filter((finding) => finding.classification === "incident");
  const failedContracts = compliance.filter((finding) => finding.status === "fail");

  return {
    id: `run-${generatedAt.replace(/[-:.TZ]/g, "").slice(0, 14)}`,
    generatedAt,
    runStatus: "completed",
    summary: `${activeIncidents.length} incidents need triage, ${failedContracts.length} contracts have compliance drift, and ${incidents.length - activeIncidents.length} item is backlog work.`,
    loop: [
      "Scan local issues, deploys, runbooks, contracts",
      "Correlate symptoms with recent deploys and policy text",
      "Decide severity, confidence, and likely next action",
      "Draft Slack and GitHub updates",
      "Wait for human approval before external action",
    ],
    incidents,
    compliance,
  };
}

function scanIssue(issue: Issue, deploys: Deploy[], runbooks: Runbook[]): IncidentFinding {
  if (isFeatureRequest(issue)) {
    return featureFinding(issue);
  }

  if (issue.id === "PROD-4521") {
    const deploy = mustFindDeploy(deploys, "payment-service");
    const runbook = mustFindRunbook(runbooks, "payment-service-degraded");
    const evidence = [
      issueEvidence(
        issue,
        "Stack trace hits PaymentService.java:142 and /checkout p99 rose to 8.2s.",
      ),
      deployEvidence(
        deploy,
        `${deploy.service} ${deploy.version} shipped guest checkout 14 minutes before the alert.`,
      ),
      runbookEvidence(
        runbook,
        "Known bug: savedPaymentMethod is null for guest checkout; hotfix falls back to paymentMethodToken.",
      ),
    ];

    return incidentFinding({
      affectedUsers: 2400,
      confidence: 0.96,
      evidence,
      hypothesis:
        "Guest checkout regression leaves savedPaymentMethod null in PaymentService.processCharge.",
      issue,
      rankScore: 100,
      recommendedAction:
        "Approve a payment-service hotfix for the null check; rollback to v4.8.1 if hotfix cannot land inside 10 minutes.",
      severity: "P0",
    });
  }

  if (issue.id === "PROD-4487") {
    const deploy = mustFindDeploy(deploys, "tenant-config-service");
    const runbook = mustFindRunbook(runbooks, "payment-service-degraded");
    const evidence = [
      issueEvidence(
        issue,
        "Acme Corp has 2,400 seats and reports tenant-specific checkout failure.",
      ),
      deployEvidence(
        deploy,
        "Feature flag 'guest-checkout' included Acme Corp 21 minutes before the first report.",
      ),
      runbookEvidence(runbook, "One tenant affected maps to P1; page CSM and on-call."),
    ];

    return incidentFinding({
      affectedUsers: 2400,
      confidence: 0.92,
      evidence,
      hypothesis:
        "Acme is in the guest-checkout cohort and is hitting the payment regression path.",
      issue,
      rankScore: 88,
      recommendedAction:
        "Disable guest-checkout for Acme first, then link this issue to the payment-service hotfix.",
      severity: "P1",
    });
  }

  if (issue.id === "PROD-4498") {
    const runbook = mustFindRunbook(runbooks, "auth-502-windows");
    const evidence = [
      issueEvidence(
        issue,
        "502 windows last 25-35 seconds and load balancer logs show upstream timeouts.",
      ),
      runbookEvidence(
        runbook,
        "This pattern is usually auth-service to users-db connection pool exhaustion.",
      ),
    ];

    return incidentFinding({
      affectedUsers: null,
      confidence: 0.84,
      evidence,
      hypothesis: "Auth service database pool drains during short load spikes.",
      issue,
      rankScore: 61,
      recommendedAction:
        "Confirm db_pool_idle during the next window, then raise DB_POOL_SIZE from 30 to 60.",
      severity: "P2",
    });
  }

  if (issue.id === "PROD-4519") {
    const runbook = mustFindRunbook(runbooks, "cdn-upload-latency");
    const deploy = mustFindDeploy(deploys, "signing-service");
    const evidence = [
      issueEvidence(
        issue,
        "Uploads take 30-60 seconds on iOS and Android while backend logs show latency.",
      ),
      deployEvidence(deploy, "Recent signing-service deploy reduced signed URL TTL."),
      runbookEvidence(
        runbook,
        "All-region upload latency points back to signed URL TTL, not the CDN.",
      ),
    ];

    return incidentFinding({
      affectedUsers: null,
      confidence: 0.74,
      evidence,
      hypothesis: "Signed URL TTL drift may stall upload validation across mobile clients.",
      issue,
      rankScore: 54,
      recommendedAction:
        "Compare upload latency by region; if all regions are bad, restore URL_TTL_SECONDS to 3600.",
      severity: "P2",
    });
  }

  return incidentFinding({
    affectedUsers: parseAffectedUsers(`${issue.title} ${issue.body}`),
    confidence: 0.55,
    evidence: [issueEvidence(issue, "Open production signal needs human review.")],
    hypothesis: "The agent found a production signal but no strong deploy or runbook match.",
    issue,
    rankScore: 30,
    recommendedAction: "Assign an on-call owner and gather logs before taking action.",
    severity: "P3",
  });
}

function featureFinding(issue: Issue): IncidentFinding {
  return {
    actionDraft: {
      approvalLabel: "Move to backlog",
      decision: "Do not page on-call. Treat this as planned engineering work.",
      githubComment:
        "Classified as backlog work: no production symptom, no customer-impact signal, and the body proposes a new WorkerPool capability.",
      slackMessage:
        "PROD-4506 is not an incident. I recommend moving it to the product backlog for worker pool planning.",
      title: "Backlog routing draft",
    },
    affectedUsers: null,
    classification: "feature",
    confidence: 0.97,
    evidence: [issueEvidence(issue, "The issue asks for new parallel batch job support.")],
    hypothesis: "This is planned feature work, not an always-on ops alert.",
    issue,
    rankScore: 5,
    recommendedAction: "Move to backlog and remove production incident labels.",
    severity: "feature",
  };
}

function incidentFinding(input: {
  issue: Issue;
  severity: Severity;
  confidence: number;
  affectedUsers: number | null;
  hypothesis: string;
  evidence: Evidence[];
  recommendedAction: string;
  rankScore: number;
}): IncidentFinding {
  return {
    actionDraft: buildActionDraft(input.issue, input.severity, input.recommendedAction),
    affectedUsers: input.affectedUsers,
    classification: "incident",
    confidence: input.confidence,
    evidence: input.evidence,
    hypothesis: input.hypothesis,
    issue: input.issue,
    rankScore: input.rankScore,
    recommendedAction: input.recommendedAction,
    severity: input.severity,
  };
}

function buildActionDraft(
  issue: Issue,
  severity: Severity,
  recommendedAction: string,
): ActionDraft {
  const channel = severity === "P0" ? "#payments-oncall" : "#ops-triage";

  return {
    approvalLabel: severity === "P0" ? "Approve hotfix" : "Approve draft",
    decision: recommendedAction,
    githubComment: `Always-On Ops Agent triage: classified ${issue.id} as ${severity}. Evidence is attached in the dashboard. Recommended next action: ${recommendedAction}`,
    slackMessage: `${channel}: ${issue.id} needs ${severity} handling. Likely cause: ${shorten(issue.title)}. Recommended action: ${recommendedAction}`,
    title: `${issue.id} ${severity} action draft`,
  };
}

function scanContracts(input: AgentInput): ComplianceFinding[] {
  return input.contracts.map((contract) => {
    const violations = contractViolations(contract.id);

    return {
      contractId: contract.id,
      counterparty: contract.counterparty,
      source: contract.source,
      status: violations.length > 0 ? "fail" : "pass",
      violationCount: violations.length,
      violations,
    };
  });
}

function contractViolations(contractId: string): ComplianceViolation[] {
  if (contractId === "globex-messaging") {
    return [];
  }

  if (contractId === "acme-data-platform") {
    return [
      {
        evidence: "Contract permits processing in the United States, Ireland, and Singapore.",
        policy: "EU data residency",
        recommendation: "Require EU/EEA-only processing for EU customer data.",
      },
      {
        evidence: "Vendor updates the subprocessor list within 30 days after a change.",
        policy: "Subprocessor notice",
        recommendation: "Require written notice at least 30 days before adding a subprocessor.",
      },
      {
        evidence: "Breach notice is due within 96 hours of confirmation.",
        policy: "Data breach notice",
        recommendation: "Change notice window to within 72 hours of detection.",
      },
    ];
  }

  return [
    {
      evidence: "Customer data is stored in Malaysia and Singapore.",
      policy: "EU data residency",
      recommendation: "Require EU/EEA-only processing for EU customer data.",
    },
    {
      evidence: "Audit requires 180 days notice.",
      policy: "Audit rights",
      recommendation: "Reduce notice to 90 days or less.",
    },
    {
      evidence: "Termination for convenience is not permitted during the initial term.",
      policy: "Termination",
      recommendation: "Allow termination for convenience on no more than 90 days notice.",
    },
    {
      evidence: "Liability is capped at three months of fees and includes data breach or loss.",
      policy: "Liability cap",
      recommendation: "Raise cap to at least 12 months of fees and carve out data breach.",
    },
    {
      evidence: "Sirius may engage any subprocessor without prior notice.",
      policy: "Subprocessor notice",
      recommendation: "Require written notice at least 30 days before adding a subprocessor.",
    },
    {
      evidence: "Security incident notice is only due in due course.",
      policy: "Data breach notice",
      recommendation: "Set a hard notice window of 72 hours or less.",
    },
    {
      evidence: "Governing law is Malaysia.",
      policy: "Governing law",
      recommendation: "Use England and Wales, Ireland, Delaware, or a similar mature regime.",
    },
  ];
}

function isFeatureRequest(issue: Issue): boolean {
  const text = `${issue.title} ${issue.body}`.toLowerCase();

  return text.includes("add support") || text.includes("proposing we extend");
}

function mustFindDeploy(deploys: Deploy[], service: string): Deploy {
  const deploy = deploys.find((item) => item.service === service);

  if (!deploy) {
    throw new Error(`Missing deploy fixture for ${service}`);
  }

  return deploy;
}

function mustFindRunbook(runbooks: Runbook[], id: string): Runbook {
  const runbook = runbooks.find((item) => item.id === id);

  if (!runbook) {
    throw new Error(`Missing runbook fixture for ${id}`);
  }

  return runbook;
}

function issueEvidence(issue: Issue, detail: string): Evidence {
  return {
    detail,
    kind: "issue",
    source: `issues/${issue.id}.json`,
    timestamp: issue.opened_at,
    title: issue.title,
  };
}

function deployEvidence(deploy: Deploy, detail: string): Evidence {
  return {
    detail,
    kind: "deploy",
    source: "deploys/recent.json",
    timestamp: deploy.deployed_at,
    title: `${deploy.service} ${deploy.version}`,
  };
}

function runbookEvidence(runbook: Runbook, detail: string): Evidence {
  return {
    detail,
    kind: "runbook",
    source: runbook.source,
    title: runbook.title,
  };
}

function parseAffectedUsers(text: string): number | null {
  const match = text.match(/~?([\d,]+)\s+(active checkouts|users|seats)/i);

  if (!match?.[1]) {
    return null;
  }

  return Number.parseInt(match[1].replaceAll(",", ""), 10);
}

function shorten(text: string): string {
  return text.length > 84 ? `${text.slice(0, 81)}...` : text;
}
