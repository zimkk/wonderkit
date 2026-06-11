export { defineAgent, getAgent, listAgents } from "./define-agent";
export { runAgent } from "./run-agent";
export { storeMemory, retrieveMemories } from "./memory";
export type { AgentConfig, AgentContext, AgentResult, AgentStep } from "./types";

// Register built-in agents on import
import "./agents/orchestrator";
import "./agents/researcher";
import "./agents/writer";
import "./agents/ops";
