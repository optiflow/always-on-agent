export type Issue = {
  id: string;
  title: string;
  status: "open" | "closed";
  severity: string | null;
  labels: string[];
  assignee: string | null;
  opened_at: string;
  reporter: string;
  body: string;
  comments: string[];
};

export type Deploy = {
  service: string;
  version: string;
  deployed_at: string;
  deployed_by: string;
  commit: string;
  summary: string;
  files_changed: string[];
  rollback_available: boolean;
  last_known_good: string;
};

export type Runbook = {
  id: string;
  title: string;
  source: string;
  body: string;
};

export type Contract = {
  id: string;
  counterparty: string;
  source: string;
  body: string;
};

export type CompliancePolicy = {
  source: string;
  body: string;
};

export type AgentInput = {
  issues: Issue[];
  deploys: Deploy[];
  runbooks: Runbook[];
  contracts: Contract[];
  compliancePolicy: CompliancePolicy;
};

export type Severity = "P0" | "P1" | "P2" | "P3" | "feature";

export type Evidence = {
  kind: "issue" | "deploy" | "runbook" | "contract" | "policy";
  title: string;
  detail: string;
  source: string;
  timestamp?: string;
};

export type ActionDraft = {
  title: string;
  decision: string;
  slackMessage: string;
  githubComment: string;
  approvalLabel: string;
};

export type IncidentFinding = {
  issue: Issue;
  classification: "incident" | "feature";
  severity: Severity;
  confidence: number;
  affectedUsers: number | null;
  hypothesis: string;
  evidence: Evidence[];
  recommendedAction: string;
  actionDraft: ActionDraft;
  rankScore: number;
};

export type ComplianceViolation = {
  policy: string;
  evidence: string;
  recommendation: string;
};

export type ComplianceFinding = {
  contractId: string;
  counterparty: string;
  source: string;
  status: "pass" | "fail";
  violationCount: number;
  violations: ComplianceViolation[];
};

export type AgentRun = {
  id: string;
  generatedAt: string;
  runStatus: "completed";
  summary: string;
  loop: string[];
  incidents: IncidentFinding[];
  compliance: ComplianceFinding[];
};
