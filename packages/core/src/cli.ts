import { runAgent } from "./agent";
import { createStarterData } from "./data";

const run = runAgent(createStarterData());

console.log(JSON.stringify(run, null, 2));
