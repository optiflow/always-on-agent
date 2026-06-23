import { runAgent } from "./agent.js";
import { createStarterData } from "./data.js";

const run = runAgent(createStarterData());

console.log(JSON.stringify(run, null, 2));
