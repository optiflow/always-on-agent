import type { AgentRun } from "./types.js";

type ClaudeOptions = {
  apiKey?: string;
  model?: string;
};

type AnthropicResponse = {
  content?: Array<{ type: string; text?: string }>;
};

type PolishPayload = {
  summary?: string;
  actions?: Record<
    string,
    {
      decision?: string;
      githubComment?: string;
      slackMessage?: string;
    }
  >;
};

export async function maybePolishRunWithClaude(
  run: AgentRun,
  options: ClaudeOptions = {},
): Promise<AgentRun> {
  const apiKey = options.apiKey ?? readEnv("ANTHROPIC_API_KEY");

  if (!apiKey) {
    return run;
  }

  try {
    const payload = await requestClaudePolish(run, {
      apiKey,
      model: options.model ?? readEnv("ANTHROPIC_MODEL") ?? "claude-sonnet-4-5-20250929",
    });

    return applyPolish(run, payload);
  } catch {
    return run;
  }
}

async function requestClaudePolish(
  run: AgentRun,
  options: Required<ClaudeOptions>,
): Promise<PolishPayload> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    body: JSON.stringify({
      max_tokens: 1200,
      messages: [
        {
          content: buildPolishPrompt(run),
          role: "user",
        },
      ],
      model: options.model,
    }),
    headers: {
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
      "x-api-key": options.apiKey,
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Claude polish failed: ${response.status}`);
  }

  const data = (await response.json()) as AnthropicResponse;
  const text = data.content?.find((item) => item.type === "text")?.text;

  if (!text) {
    throw new Error("Claude polish response had no text content");
  }

  return JSON.parse(stripCodeFence(text)) as PolishPayload;
}

function applyPolish(run: AgentRun, payload: PolishPayload): AgentRun {
  return {
    ...run,
    incidents: run.incidents.map((finding) => {
      const action = payload.actions?.[finding.issue.id];

      if (!action) {
        return finding;
      }

      return {
        ...finding,
        actionDraft: {
          ...finding.actionDraft,
          decision: action.decision ?? finding.actionDraft.decision,
          githubComment: action.githubComment ?? finding.actionDraft.githubComment,
          slackMessage: action.slackMessage ?? finding.actionDraft.slackMessage,
        },
      };
    }),
    summary: payload.summary ?? run.summary,
  };
}

function buildPolishPrompt(run: AgentRun): string {
  const actionDrafts = run.incidents.map((finding) => ({
    decision: finding.actionDraft.decision,
    githubComment: finding.actionDraft.githubComment,
    id: finding.issue.id,
    severity: finding.severity,
    slackMessage: finding.actionDraft.slackMessage,
  }));

  return `Rewrite this ops-agent run summary and action drafts for a clear hackathon demo.
Keep every fact, issue id, severity, source, and recommended action unchanged.
Do not add claims. Return only valid JSON with this shape:
{"summary":"...","actions":{"PROD-4521":{"decision":"...","slackMessage":"...","githubComment":"..."}}}

Input:
${JSON.stringify({ actionDrafts, summary: run.summary }, null, 2)}`;
}

function stripCodeFence(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/u, "")
    .trim();
}

function readEnv(name: string): string | undefined {
  const globalWithProcess = globalThis as {
    process?: { env?: Record<string, string | undefined> };
  };

  return globalWithProcess.process?.env?.[name];
}
