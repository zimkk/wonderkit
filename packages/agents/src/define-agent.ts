import { z } from "zod";
import { AgentConfigSchema, type AgentConfig } from "./types";

type AgentInput = z.input<typeof AgentConfigSchema>;

const registry = new Map<string, AgentConfig>();

/** Register an agent definition. Call at module load time. `tools` and `maxSteps` default if omitted. */
export function defineAgent(config: AgentInput): AgentConfig {
  const parsed = AgentConfigSchema.parse(config);
  registry.set(parsed.id, parsed);
  return parsed;
}

/** Retrieve a registered agent by id. Throws if not found. */
export function getAgent(id: string): AgentConfig {
  const agent = registry.get(id);
  if (!agent) throw new Error(`Agent "${id}" not registered. Did you import its module?`);
  return agent;
}

export function listAgents(): AgentConfig[] {
  return Array.from(registry.values());
}
