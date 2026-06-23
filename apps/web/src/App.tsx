import {
  type AgentRun,
  type ComplianceFinding,
  createStarterData,
  type IncidentFinding,
  runAgent,
} from "@always-on-agent/core";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileText,
  GitBranch,
  Play,
  Radio,
  Settings,
  ShieldCheck,
  Siren,
  Workflow,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";

const scanInterval = import.meta.env.VITE_AGENT_SCAN_INTERVAL_MINUTES ?? "5";

export default function App() {
  const [runCount, setRunCount] = useState(0);
  const [selectedId, setSelectedId] = useState("PROD-4521");
  const [approved, setApproved] = useState<Record<string, boolean>>({});

  const run = useMemo(
    () =>
      runAgent(createStarterData(), {
        now: new Date(Date.UTC(2026, 4, 20, 8, runCount, 0)).toISOString(),
      }),
    [runCount],
  );
  const selected =
    run.incidents.find((finding) => finding.issue.id === selectedId) ?? run.incidents[0];
  const criticalCount = run.incidents.filter((finding) => finding.severity === "P0").length;
  const driftCount = run.compliance.filter((finding) => finding.status === "fail").length;

  function runNow() {
    setRunCount((value) => value + 1);
  }

  function approveSelected() {
    if (!selected) {
      return;
    }

    setApproved((current) => ({ ...current, [selected.issue.id]: true }));
  }

  return (
    <div className="app-shell">
      <aside className="rail" aria-label="Main navigation">
        <div className="rail-mark">
          <Bot size={22} />
        </div>
        <button className="rail-button active" type="button" aria-label="Incidents">
          <Siren size={20} />
        </button>
        <button className="rail-button" type="button" aria-label="Compliance">
          <ShieldCheck size={20} />
        </button>
        <button className="rail-button" type="button" aria-label="Runs">
          <Workflow size={20} />
        </button>
        <button className="rail-button rail-bottom" type="button" aria-label="Settings">
          <Settings size={20} />
        </button>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <h1>Always-On Ops Agent</h1>
            <p>{run.summary}</p>
          </div>
          <div className="topbar-actions">
            <div className="watch-state">
              <Radio size={15} />
              <span>Watching every {scanInterval} min</span>
            </div>
            <div className="last-run">
              <Clock3 size={15} />
              <span>Last run {formatTime(run.generatedAt)}</span>
            </div>
            <div className={`run-status ${runCount > 0 ? "complete" : ""}`} aria-live="polite">
              <CheckCircle2 size={15} />
              <span>{runCount > 0 ? `Run ${runCount} complete` : "Ready"}</span>
            </div>
            <button className="primary-button" type="button" onClick={runNow}>
              <Play size={16} />
              {runCount > 0 ? "Run again" : "Run now"}
            </button>
          </div>
        </header>

        <section className="stats-row" aria-label="Run summary">
          <Stat label="Critical incidents" value={criticalCount.toString()} tone="danger" />
          <Stat label="Contracts with drift" value={driftCount.toString()} tone="warning" />
          <Stat label="Action drafts" value={run.incidents.length.toString()} tone="teal" />
          <Flow run={run} />
        </section>

        <section className="triage-grid" aria-label="Incident triage">
          <IncidentQueue
            incidents={run.incidents}
            selectedId={selected?.issue.id}
            onSelect={setSelectedId}
          />
          {selected ? <EvidencePanel finding={selected} /> : null}
          {selected ? (
            <ActionDrawer
              finding={selected}
              approved={approved[selected.issue.id] ?? false}
              onApprove={approveSelected}
            />
          ) : null}
        </section>

        <ComplianceBand findings={run.compliance} />
      </main>
    </div>
  );
}

function Stat(props: { label: string; value: string; tone: "danger" | "warning" | "teal" }) {
  return (
    <div className={`stat ${props.tone}`}>
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function Flow({ run }: { run: AgentRun }) {
  return (
    <ul className="agent-flow" aria-label="Agent loop">
      {run.loop.map((step, index) => (
        <li className="flow-step" key={step}>
          <span>{index + 1}</span>
          <p>{flowLabel(index, step)}</p>
        </li>
      ))}
    </ul>
  );
}

function flowLabel(index: number, fallback: string): string {
  return (
    ["Scan local", "Correlate symptoms", "Decide severity", "Draft Slack", "Wait approval"][
      index
    ] ?? fallback
  );
}

function IncidentQueue(props: {
  incidents: IncidentFinding[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="panel queue-panel">
      <div className="panel-title">
        <div>
          <h2>Incident queue</h2>
          <p>Ranked by impact, deploy match, and runbook evidence.</p>
        </div>
        <span className="count">{props.incidents.length}</span>
      </div>

      <div className="queue-list">
        {props.incidents.map((finding) => (
          <button
            className={`issue-row ${props.selectedId === finding.issue.id ? "selected" : ""}`}
            key={finding.issue.id}
            type="button"
            onClick={() => props.onSelect(finding.issue.id)}
          >
            <span className={`severity ${finding.severity.toLowerCase()}`}>{finding.severity}</span>
            <span className="issue-main">
              <strong>{finding.issue.id}</strong>
              <span>{finding.issue.title}</span>
            </span>
            <span className="issue-meta">
              <span>{formatUsers(finding.affectedUsers)}</span>
              <span>{formatPercent(finding.confidence)}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function EvidencePanel({ finding }: { finding: IncidentFinding }) {
  return (
    <section className="panel evidence-panel">
      <div className="panel-title">
        <div>
          <h2>Evidence</h2>
          <p>{finding.hypothesis}</p>
        </div>
        <span className="confidence">{formatPercent(finding.confidence)}</span>
      </div>

      <div className="timeline">
        {finding.evidence.map((item) => (
          <div className="timeline-item" key={`${item.kind}-${item.title}`}>
            <div className="timeline-dot" />
            <div>
              <div className="timeline-head">
                <span>{item.kind}</span>
                <strong>{item.title}</strong>
              </div>
              <p>{item.detail}</p>
              <small>{item.source}</small>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ActionDrawer(props: {
  finding: IncidentFinding;
  approved: boolean;
  onApprove: () => void;
}) {
  return (
    <section className="panel action-panel">
      <div className="panel-title">
        <div>
          <h2>Action draft</h2>
          <p>{props.finding.actionDraft.title}</p>
        </div>
        {props.approved ? <CheckCircle2 className="approved-icon" size={22} /> : null}
      </div>

      <div className="decision-box">
        <Zap size={18} />
        <p>{props.finding.actionDraft.decision}</p>
      </div>

      <DraftBlock
        icon={<AlertTriangle size={17} />}
        label="Slack"
        value={props.finding.actionDraft.slackMessage}
      />
      <DraftBlock
        icon={<GitBranch size={17} />}
        label="GitHub"
        value={props.finding.actionDraft.githubComment}
      />

      <div className="approval-actions">
        <button className="primary-button full" type="button" onClick={props.onApprove}>
          <ClipboardCheck size={16} />
          {props.approved ? "Approved" : props.finding.actionDraft.approvalLabel}
        </button>
        <button className="secondary-button" type="button">
          Hold for human review
        </button>
      </div>
    </section>
  );
}

function DraftBlock(props: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="draft-block">
      <div className="draft-label">
        {props.icon}
        <span>{props.label}</span>
      </div>
      <p>{props.value}</p>
    </div>
  );
}

function ComplianceBand({ findings }: { findings: ComplianceFinding[] }) {
  return (
    <section className="compliance-band" aria-label="Compliance drift">
      <div className="band-heading">
        <div>
          <h2>Compliance drift scan</h2>
          <p>Contracts checked against data residency, audit, breach, and subprocessor policy.</p>
        </div>
        <FileText size={20} />
      </div>
      <div className="contract-grid">
        {findings.map((finding) => (
          <article className={`contract-card ${finding.status}`} key={finding.contractId}>
            <div className="contract-head">
              <span>{finding.status === "pass" ? "Pass" : `${finding.violationCount} flags`}</span>
              {finding.status === "pass" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            </div>
            <h3>{finding.counterparty}</h3>
            <p>
              {finding.status === "pass" ? "No policy drift found." : finding.violations[0]?.policy}
            </p>
            <small>{finding.source}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(value));
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatUsers(value: number | null): string {
  return value === null ? "unknown" : `${value.toLocaleString()} users`;
}
