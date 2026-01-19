/**
 * Multi-Agent System Types
 * Defines the core types for sub-agent spawning and orchestration
 */

/**
 * Role of a sub-agent - determines its specialized capabilities
 */
export type SubAgentRole =
    | "researcher"   // Gathers information, searches, and synthesizes knowledge
    | "creator"      // Generates content, art, code, or other creative outputs
    | "executor"     // Performs actions, runs tasks, interacts with external systems
    | "reviewer"     // Validates, critiques, and improves outputs from other agents

/**
 * Current status of a sub-agent
 */
export type SubAgentStatus =
    | "idle"         // Waiting for a task
    | "working"      // Currently executing a task
    | "complete"     // Task finished successfully
    | "error"        // Task failed with an error

/**
 * A sub-agent instance spawned by the parent orchestrator
 */
export interface SubAgent {
    id: string
    name: string
    role: SubAgentRole
    status: SubAgentStatus
    task?: string
    progress?: number        // 0-100 progress percentage
    result?: unknown         // Task result when complete
    error?: string           // Error message if status is "error"
    startedAt?: Date
    completedAt?: Date
    parentAgentId?: string   // ID of the parent agent that spawned this one
}

/**
 * Configuration for spawning a new sub-agent
 */
export interface SpawnSubAgentConfig {
    name: string
    role: SubAgentRole
    task: string
    context?: Record<string, unknown>  // Additional context for the task
    timeout?: number                    // Max execution time in ms
}

/**
 * Agent pool configuration
 */
export interface AgentPoolConfig {
    maxAgents: number           // Maximum concurrent sub-agents
    defaultTimeout: number      // Default timeout for sub-agent tasks (ms)
    allowParallelSameRole: boolean  // Allow multiple agents of the same role
}

/**
 * Default pool configuration
 */
export const DEFAULT_POOL_CONFIG: AgentPoolConfig = {
    maxAgents: 4,
    defaultTimeout: 60_000,
    allowParallelSameRole: true,
}

/**
 * Agent pool state - tracks all active and completed sub-agents
 */
export interface AgentPoolState {
    config: AgentPoolConfig
    activeAgents: SubAgent[]
    completedAgents: SubAgent[]  // Recent history for debugging/display
}

/**
 * Result from a sub-agent execution
 */
export interface SubAgentResult<T = unknown> {
    agentId: string
    role: SubAgentRole
    success: boolean
    result?: T
    error?: string
    duration: number  // Execution time in ms
}

/**
 * Event emitted when sub-agent state changes
 */
export interface SubAgentEvent {
    type: "spawned" | "progress" | "completed" | "error"
    agent: SubAgent
    timestamp: Date
}

/**
 * Callback for sub-agent events
 */
export type SubAgentEventCallback = (event: SubAgentEvent) => void
