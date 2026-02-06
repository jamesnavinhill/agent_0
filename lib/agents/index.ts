/**
 * Agents Module
 * Central exports for the AI SDK agent system
 */

// Types
export type {
  SubAgent,
  SubAgentRole,
  SubAgentStatus,
  SpawnSubAgentConfig,
  AgentPoolConfig,
  AgentPoolState,
  SubAgentResult,
  SubAgentEvent,
  SubAgentEventCallback,
} from "./types"

export { DEFAULT_POOL_CONFIG } from "./types"

// Agent Pool (legacy system - works alongside AI SDK)
export { AgentPool, getAgentPool } from "./agent-pool"
export { createSubAgent, executeSubAgent } from "./sub-agent"

// AI SDK Agents
export {
  orchestratorAgent,
  researcherAgent,
  creatorAgent,
  reviewerAgent,
  getSubAgent,
} from "./ai-sdk-agents"

// Agent Executor
export {
  executeOrchestrator,
  executeSubAgentTask,
  executeParallelSubAgents,
  executeAutonomousTask,
} from "./agent-executor"

export type {
  AgentExecutionResult,
  AgentStep,
  ToolCallRecord,
} from "./agent-executor"

// Tools
export {
  orchestratorTools,
  researcherTools,
  creatorTools,
  reviewerTools,
  researchTool,
  imageGenerationTool,
  knowledgeTool,
  recallMemoryTool,
  searchKnowledgeTool,
  codeGenerationTool,
  analysisTool,
  delegateTool,
  reportTool,
} from "./tools"
