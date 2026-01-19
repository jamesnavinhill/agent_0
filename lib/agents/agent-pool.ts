/**
 * Agent Pool Manager
 * Manages spawning, tracking, and collecting results from sub-agents
 */

import {
    SubAgent,
    SpawnSubAgentConfig,
    AgentPoolConfig,
    AgentPoolState,
    SubAgentResult,
    SubAgentEventCallback,
    DEFAULT_POOL_CONFIG,
} from "./types"
import { createSubAgent, executeSubAgent } from "./sub-agent"
import { logger } from "@/lib/logging/logger"

/**
 * Agent Pool class for managing multiple sub-agents
 */
export class AgentPool {
    private state: AgentPoolState
    private eventCallbacks: SubAgentEventCallback[] = []

    constructor(config: Partial<AgentPoolConfig> = {}) {
        this.state = {
            config: { ...DEFAULT_POOL_CONFIG, ...config },
            activeAgents: [],
            completedAgents: [],
        }
    }

    /**
     * Get current pool configuration
     */
    getConfig(): AgentPoolConfig {
        return { ...this.state.config }
    }

    /**
     * Update pool configuration
     */
    setConfig(updates: Partial<AgentPoolConfig>): void {
        this.state.config = { ...this.state.config, ...updates }
    }

    /**
     * Get all active sub-agents
     */
    getActiveAgents(): SubAgent[] {
        return [...this.state.activeAgents]
    }

    /**
     * Get recently completed sub-agents
     */
    getCompletedAgents(): SubAgent[] {
        return [...this.state.completedAgents]
    }

    /**
     * Check if pool can spawn a new agent
     */
    canSpawn(): boolean {
        return this.state.activeAgents.length < this.state.config.maxAgents
    }

    /**
     * Check if pool can spawn an agent with a specific role
     */
    canSpawnRole(role: SubAgent["role"]): boolean {
        if (!this.canSpawn()) return false

        if (!this.state.config.allowParallelSameRole) {
            const hasActiveWithRole = this.state.activeAgents.some(a => a.role === role)
            return !hasActiveWithRole
        }

        return true
    }

    /**
     * Register an event callback
     */
    onEvent(callback: SubAgentEventCallback): () => void {
        this.eventCallbacks.push(callback)
        return () => {
            this.eventCallbacks = this.eventCallbacks.filter(cb => cb !== callback)
        }
    }

    /**
     * Emit event to all registered callbacks
     */
    private emitEvent(agent: SubAgent, type: "spawned" | "progress" | "completed" | "error"): void {
        const event = { type, agent, timestamp: new Date() }
        for (const cb of this.eventCallbacks) {
            try {
                cb(event)
            } catch (err) {
                logger.error("Error in pool event callback", { source: "agent-pool" })
            }
        }
    }

    /**
     * Spawn a new sub-agent
     * Returns the agent ID if successful, null if pool is full
     */
    spawn(config: SpawnSubAgentConfig): SubAgent | null {
        if (!this.canSpawnRole(config.role)) {
            logger.warn(`Cannot spawn sub-agent: pool limit reached or role conflict`, {
                source: "agent-pool",
                role: config.role,
                activeCount: this.state.activeAgents.length,
                maxAgents: this.state.config.maxAgents,
            })
            return null
        }

        const agent = createSubAgent(config)
        this.state.activeAgents.push(agent)

        logger.info(`Spawned sub-agent: ${agent.name} (${agent.role})`, {
            source: "agent-pool",
            agentId: agent.id,
        })

        this.emitEvent(agent, "spawned")
        return agent
    }

    /**
     * Spawn and execute a sub-agent, returning the result
     */
    async spawnAndExecute(
        config: SpawnSubAgentConfig,
        context: Record<string, unknown> = {}
    ): Promise<SubAgentResult | null> {
        const agent = this.spawn(config)
        if (!agent) return null

        const result = await executeSubAgent(agent, context, (event) => {
            // Forward events from sub-agent execution
            for (const cb of this.eventCallbacks) {
                try {
                    cb(event)
                } catch { }
            }
        })

        // Move from active to completed
        this.state.activeAgents = this.state.activeAgents.filter(a => a.id !== agent.id)
        this.state.completedAgents.unshift(agent)

        // Keep only last 20 completed agents
        if (this.state.completedAgents.length > 20) {
            this.state.completedAgents = this.state.completedAgents.slice(0, 20)
        }

        return result
    }

    /**
     * Spawn multiple sub-agents and execute them in parallel
     */
    async spawnParallel(
        configs: SpawnSubAgentConfig[],
        contexts: Record<string, unknown>[] = []
    ): Promise<SubAgentResult[]> {
        const results: SubAgentResult[] = []
        const promises: Promise<SubAgentResult | null>[] = []

        for (let i = 0; i < configs.length; i++) {
            const config = configs[i]
            const context = contexts[i] || {}

            if (this.canSpawnRole(config.role)) {
                promises.push(this.spawnAndExecute(config, context))
            } else {
                logger.warn(`Skipping spawn for ${config.name}: cannot spawn role ${config.role}`, {
                    source: "agent-pool",
                })
            }
        }

        const settled = await Promise.all(promises)

        for (const result of settled) {
            if (result) {
                results.push(result)
            }
        }

        return results
    }

    /**
     * Get a specific agent by ID
     */
    getAgent(id: string): SubAgent | undefined {
        return this.state.activeAgents.find(a => a.id === id)
            || this.state.completedAgents.find(a => a.id === id)
    }

    /**
     * Cancel an active agent (if possible)
     */
    cancel(id: string): boolean {
        const index = this.state.activeAgents.findIndex(a => a.id === id)
        if (index === -1) return false

        const agent = this.state.activeAgents[index]
        agent.status = "error"
        agent.error = "Cancelled by user"
        agent.completedAt = new Date()

        this.state.activeAgents.splice(index, 1)
        this.state.completedAgents.unshift(agent)

        this.emitEvent(agent, "error")

        logger.info(`Cancelled sub-agent: ${agent.name}`, {
            source: "agent-pool",
            agentId: agent.id,
        })

        return true
    }

    /**
     * Clear completed agents history
     */
    clearHistory(): void {
        this.state.completedAgents = []
    }

    /**
     * Get pool statistics
     */
    getStats(): {
        activeCount: number
        completedCount: number
        maxAgents: number
        successRate: number
    } {
        const completed = this.state.completedAgents
        const successCount = completed.filter(a => a.status === "complete").length

        return {
            activeCount: this.state.activeAgents.length,
            completedCount: completed.length,
            maxAgents: this.state.config.maxAgents,
            successRate: completed.length > 0 ? successCount / completed.length : 1,
        }
    }
}

// Singleton instance
let globalPool: AgentPool | null = null

/**
 * Get the global agent pool instance
 */
export function getAgentPool(config: Partial<AgentPoolConfig> = {}): AgentPool {
    if (!globalPool) {
        globalPool = new AgentPool(config)
    }
    return globalPool
}
