import type { AgentInput } from "./types";

const issues = [
  {
    id: "PROD-4487",
    title: "Customer 'cannot complete checkout' (Acme Corp, 2400 users)",
    status: "open",
    severity: null,
    labels: ["customer-impact"],
    assignee: null,
    opened_at: "2026-05-20T07:33:09Z",
    reporter: "customer-success@bts-synthetic.example",
    body: "Enterprise customer Acme Corp (2,400 seats) reporting that none of their users can complete checkout as of 07:25 UTC. They've sent screenshots showing a spinner that never resolves on the payment confirmation step. Other customers do not appear affected — this looks tenant-specific. Acme's CTO is on a call with our CSM in 25 minutes.",
    comments: []
  },
  {
    id: "PROD-4498",
    title: "Login endpoint occasionally returns 502 for ~30s windows",
    status: "open",
    severity: null,
    labels: [],
    assignee: null,
    opened_at: "2026-05-12T22:14:55Z",
    reporter: "monitoring-alerts@bts-synthetic.example",
    body: "Synthetic monitoring detected 3 separate 502 windows in the last 24 hours on POST /auth/login. Each lasted 25-35 seconds, then resolved itself. No deploys in the relevant time windows. Auth service pods show no restarts. Load balancer logs show upstream timeouts. Possible connection pool exhaustion?",
    comments: []
  },
  {
    id: "PROD-4506",
    title: "Add support for parallel batch jobs in worker pool",
    status: "open",
    severity: null,
    labels: [],
    assignee: null,
    opened_at: "2026-05-15T16:01:00Z",
    reporter: "priya.shah@bts-synthetic.example",
    body: "Currently the worker pool serialises batch jobs. For the new ingestion pipeline we'll need to run up to 8 concurrent batches. Proposing we extend WorkerPool with a max_concurrency setting, default 1, and update the dispatcher to honour it. Would also want a simple back-pressure signal.",
    comments: []
  },
  {
    id: "PROD-4519",
    title: "Slow image uploads in mobile app",
    status: "open",
    severity: null,
    labels: [],
    assignee: null,
    opened_at: "2026-05-18T09:42:11Z",
    reporter: "customer-support@bts-synthetic.example",
    body: "Customers reporting 30-60s upload times for product photos in the mobile app. Started intermittently 2 days ago, now consistent. iOS and Android both affected. CDN dashboard shows normal traffic patterns. Backend logs show no errors but latency on POST /uploads/images has tripled.",
    comments: []
  },
  {
    id: "PROD-4521",
    title: "NullPointerException in PaymentService at checkout",
    status: "open",
    severity: null,
    labels: [],
    assignee: null,
    opened_at: "2026-05-19T14:18:23Z",
    reporter: "monitoring-alerts@bts-synthetic.example",
    body: "p99 latency on /checkout has jumped from 800ms to 8.2s over the last 14 minutes. Error rate is up 340%. Stack trace from sampled requests:\n\njava.lang.NullPointerException\n  at com.bts.payments.PaymentService.processCharge(PaymentService.java:142)\n  at com.bts.payments.PaymentController.charge(PaymentController.java:67)\n  at sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)\n\nAffected: ~2,400 active checkouts. Region: us-east-1, eu-west-2.",
    comments: []
  }
] satisfies AgentInput["issues"];

const deploys = [
  {
    service: "payment-service",
    version: "v4.8.2",
    deployed_at: "2026-05-19T14:04:11Z",
    deployed_by: "tom.bryce@bts-synthetic.example",
    commit: "9f4a1c8",
    summary: "Add guest checkout support",
    files_changed: ["PaymentService.java", "PaymentController.java", "CheckoutRequest.java"],
    rollback_available: true,
    last_known_good: "v4.8.1"
  },
  {
    service: "signing-service",
    version: "v2.1.4",
    deployed_at: "2026-05-17T11:22:00Z",
    deployed_by: "yuki.tanaka@bts-synthetic.example",
    commit: "a87f2dd",
    summary: "Reduce URL TTL for security review",
    files_changed: ["config/prod.yaml"],
    rollback_available: true,
    last_known_good: "v2.1.3"
  },
  {
    service: "auth-service",
    version: "v6.0.0",
    deployed_at: "2026-05-14T08:15:42Z",
    deployed_by: "maya.singh@bts-synthetic.example",
    commit: "33ba109",
    summary: "Major: switch session storage to Redis",
    files_changed: ["SessionStore.java", "config/prod.yaml", "infrastructure/redis.tf"],
    rollback_available: false,
    last_known_good: "v5.9.7"
  },
  {
    service: "frontend",
    version: "v12.4.1",
    deployed_at: "2026-05-20T06:50:33Z",
    deployed_by: "ci-bot@bts-synthetic.example",
    commit: "ee23d44",
    summary: "Minor: copy update on pricing page",
    files_changed: ["src/pages/pricing.tsx"],
    rollback_available: true,
    last_known_good: "v12.4.0"
  },
  {
    service: "tenant-config-service",
    version: "v3.2.1",
    deployed_at: "2026-05-20T07:12:08Z",
    deployed_by: "ci-bot@bts-synthetic.example",
    commit: "1c4b9a2",
    summary: "Enable feature flag 'guest-checkout' for cohort B (Acme Corp included)",
    files_changed: ["feature-flags/cohort-b.yaml"],
    rollback_available: true,
    last_known_good: "v3.2.0"
  }
] satisfies AgentInput["deploys"];

const runbooks = [
  {
    id: "payment-service-degraded",
    title: "Payment Service Degraded",
    source: "runbooks/payment-service-degraded.md",
    body: "Check recent payment-service deploys in the last 60 minutes. If PaymentService.java:142 appears, the known NPE bug is customer.savedPaymentMethod being null for guest checkout. Hotfix with a null check and fall back to request.paymentMethodToken. Severity guide: all customers P0, one tenant P1."
  },
  {
    id: "auth-502-windows",
    title: "Login 502 Windows",
    source: "runbooks/auth-502-windows.md",
    body: "Bursts of HTTP 502 on POST /auth/login with upstream timeouts and no related deploys are usually connection pool exhaustion on auth-service to users-db. Confirm db_pool_idle is 0, then bump DB_POOL_SIZE from 30 to 60."
  },
  {
    id: "cdn-upload-latency",
    title: "CDN Upload Latency",
    source: "runbooks/cdn-upload-latency.md",
    body: "For mobile or web image uploads taking 30+ seconds, compare upload latency by region. If all regions are bad and the issue started within 6 hours of a signing-service deploy, suspect signed URL TTL and set URL_TTL_SECONDS to 3600."
  }
] satisfies AgentInput["runbooks"];

const contracts = [
  {
    id: "acme-data-platform",
    counterparty: "Acme Data Platform Ltd.",
    source: "contracts/acme-data-platform.md",
    body: "Vendor may process customer data in any region including the United States, Ireland, and Singapore. Vendor will update its subprocessor list within 30 days of any change. Vendor will notify the customer within 96 hours of confirming a security incident affecting customer data."
  },
  {
    id: "globex-messaging",
    counterparty: "Globex Messaging Inc.",
    source: "contracts/globex-messaging.md",
    body: "All customer data will be processed exclusively within the EEA. Customer audit rights require 30 days notice. The customer may terminate for convenience on 60 days notice. Liability is capped at 12 months of fees and excludes data breach. Globex gives at least 30 days written notice before engaging a new subprocessor and notifies within 24 hours of detecting a breach. Governing law is England and Wales."
  },
  {
    id: "sirius-storage",
    counterparty: "Sirius Storage SDN BHD",
    source: "contracts/sirius-storage.md",
    body: "Customer data is stored in Malaysia and Singapore. Customer audit requires 180 days notice. Termination for convenience is not permitted during the initial term. Liability is capped at three months of fees and applies to data breach or loss. Sirius may engage any subprocessor without prior notice. Security incident notice is in due course. Governing law is Malaysia."
  }
] satisfies AgentInput["contracts"];

export const starterData: AgentInput = {
  compliancePolicy: {
    source: "compliance-policy.md",
    body: "EU customer data must remain in the EU. Audit rights need at most 90 days notice. Termination for convenience must be available within 90 days. Liability cap must be at least 12 months of fees and not exclude data breach. New subprocessors need at least 30 days written notice. Breach notice must be within 72 hours."
  },
  contracts,
  deploys,
  issues,
  runbooks
};

export function createStarterData(): AgentInput {
  return JSON.parse(JSON.stringify(starterData)) as AgentInput;
}
