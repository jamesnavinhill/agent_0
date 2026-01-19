/**
 * React hook for sub-agent visibility and control
 */

import { useState, useEffect, useCallback, useRef } from "react"
import {
    SubAgent,
    SpawnSubAgentConfig,
    SubAgentEvent,
    SubAgentResult
} from "@/lib/agents/types"
import { getAgentPool, AgentPool } from "@/lib/agents/agent-pool"
import { useAgentStore } from "@/lib/store/agent-store"

export interface UseSubAgentsReturn {
    // State
    activeAgents: SubAgent[]
    completedAgents: SubAgent[]
    isSpawning: boolean

    // Actions
    spawn: (config: SpawnSubAgentConfig, context?: Record<string, unknown>) => Promise<SubAgentResult | null>
    spawnParallel: (configs: SpawnSubAgentConfig[], contexts?: Record<string, unknown>[]) => Promise<SubAgentResult[]>
    cancel: (agentId: string) => boolean
    clearHistory: () => void

    // Pool info
    canSpawn: boolean
    stats: {
        activeCount: number
        completedCount: number
        maxAgents: number
        successRate: number
    }
}

export function useSubAgents(): UseSubAgentsReturn {
    const [activeAgents, setActiveAgents] = useState<SubAgent[]>([])
    const [completedAgents, setCompletedAgents] = useState<SubAgent[]>([])
    const [isSpawning, setIsSpawning] = useState(false)
    const [stats, setStats] = useState({
        activeCount: 0,
        completedCount: 0,
        maxAgents: 4,
        successRate: 1,
    })

    const poolRef = useRef<AgentPool | null>(null)
    const { addThought, addActivity } = useAgentStore()

    // Initialize pool and subscribe to events
    useEffect(() => {
        // Only initialize on client side
        if (typeof window === "undefined") return

        const pool = getAgentPool()
        poolRef.current = pool

        // Initial state
        setActiveAgents(pool.getActiveAgents())
        setCompletedAgents(pool.getCompletedAgents())
        setStats(pool.getStats())

        // Subscribe to events
        const unsubscribe = pool.onEvent((event: SubAgentEvent) => {
            // Update local state
            setActiveAgents(pool.getActiveAgents())
            setCompletedAgents(pool.getCompletedAgents())
            setStats(pool.getStats())

            // Add to thoughts/activity stream
            switch (event.type) {
                case "spawned":
                    addThought(
                        `Spawned sub-agent "${event.agent.name}" (${event.agent.role}) for: ${event.agent.task}`,
                        "action"
                    )
                    addActivity(`Sub-agent spawned: ${event.agent.name}`, event.agent.task)
                    break
                case "progress":
                    // Progress updates are frequent, just update state
                    break
                case "completed":
                    addThought(
                        `Sub-agent "${event.agent.name}" completed successfully`,
                        "observation"
                    )
                    addActivity(`Sub-agent completed: ${event.agent.name}`, "Task completed successfully")
                    break
                case "error":
                    addThought(
                        `Sub-agent "${event.agent.name}" failed: ${event.agent.error}`,
                        "observation"
                    )
                    addActivity(`Sub-agent error: ${event.agent.name}`, event.agent.error)
                    break
            }
        })

        return () => {
            unsubscribe()
        }
    }, [addThought, addActivity])

    const spawn = useCallback(async (
        config: SpawnSubAgentConfig,
        context: Record<string, unknown> = {}
    ): Promise<SubAgentResult | null> => {
        const pool = poolRef.current
        if (!pool) return null

        setIsSpawning(true)
        try {
            const result = await pool.spawnAndExecute(config, context)
            return result
        } finally {
            setIsSpawning(false)
        }
    }, [])

    const spawnParallel = useCallback(async (
        configs: SpawnSubAgentConfig[],
        contexts: Record<string, unknown>[] = []
    ): Promise<SubAgentResult[]> => {
        const pool = poolRef.current
        if (!pool) return []

        setIsSpawning(true)
        try {
            const results = await pool.spawnParallel(configs, contexts)
            return results
        } finally {
            setIsSpawning(false)
        }
    }, [])

    const cancel = useCallback((agentId: string): boolean => {
        const pool = poolRef.current
        if (!pool) return false
        return pool.cancel(agentId)
    }, [])

    const clearHistory = useCallback((): void => {
        const pool = poolRef.current
        if (!pool) return
        pool.clearHistory()
        setCompletedAgents([])
    }, [])

    const canSpawn = poolRef.current?.canSpawn() ?? true

    return {
        activeAgents,
        completedAgents,
        isSpawning,
        spawn,
        spawnParallel,
        cancel,
        clearHistory,
        canSpawn,
        stats,
    }
}
