import { runAgent } from "./agent.js";
import { maybePolishRunWithClaude } from "./claude.js";
import { createStarterData } from "./data.js";

const run = await maybePolishRunWithClaude(runAgent(createStarterData()));

console.log(JSON.stringify(run, null, 2));
