import type { ScheduledTask as StoreScheduledTask } from "@/lib/store/agent-store"
import { getAgentPool } from "@/lib/agents/agent-pool"
import type { SpawnSubAgentConfig, SubAgentResult } from "@/lib/agents/types"
import { pushActivity } from "@/lib/activity/bus"

export interface OrchestratorConfig {
  intervalMs: number
  enabled: boolean
  maxProposalsPerRun: number
  scoreThreshold: number
  autoStart: boolean
  /** Enable sub-agent spawning for complex tasks */
  useSubAgents: boolean
  /** Maximum sub-agents per orchestrator run */
  maxSubAgentsPerRun: number
}

export const DEFAULT_ORCHESTRATOR_CONFIG: OrchestratorConfig = {
  intervalMs: 60_000,
  enabled: false,
  maxProposalsPerRun: 2,
  scoreThreshold: 0.5,
  autoStart: false,
  useSubAgents: true,
  maxSubAgentsPerRun: 3,
}

export type ProposeTaskCallback = (ctx: OrchestratorContext) => Promise<Array<Omit<StoreScheduledTask, "id">>>

export interface OrchestratorContext {
  getAgentState: () => unknown
  addScheduledTask: (task: Omit<StoreScheduledTask, "id">) => void
  addActivity: (action: string, details?: string) => void
  addThought: (content: string, type: "observation" | "reasoning" | "decision" | "action") => void
}

/**
 * Task decomposition result for multi-agent execution
 */
interface TaskDecomposition {
  subTasks: SpawnSubAgentConfig[]
  shouldDecompose: boolean
}

export class Orchestrator {
  private config: OrchestratorConfig
  private context: OrchestratorContext | null = null
  private intervalId: ReturnType<typeof setInterval> | null = null
  private proposeCallback: ProposeTaskCallback | null = null
  private _isRunning = false

  constructor(config: Partial<OrchestratorConfig> = {}) {
    this.config = { ...DEFAULT_ORCHESTRATOR_CONFIG, ...config }
  }

  setContext(ctx: OrchestratorContext) {
    this.context = ctx
  }

  setConfig(updates: Partial<OrchestratorConfig>) {
    this.config = { ...this.config, ...updates }
    if (this.config.enabled && this.config.autoStart && !this.isRunning) {
      this.start()
    }
  }

  setProposeCallback(cb: ProposeTaskCallback) {
    this.proposeCallback = cb
  }

  start() {
    if (this._isRunning) return
    if (!this.context) throw new Error("Orchestrator context not set")
    this._isRunning = true
    this.intervalId = setInterval(() => this.runOnce(), this.config.intervalMs)
    // run immediately once
    this.runOnce().catch(() => { })
  }

  stop() {
    if (!this._isRunning) return
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this._isRunning = false
  }

  get isRunning() {
    return this._isRunning
  }

  /**
   * Decompose a complex task into sub-agent tasks
   */
  decomposeTask(taskName: string, taskDescription: string): TaskDecomposition {
    // Simple heuristic: research tasks can be parallelized
    const isResearchTask = taskName.toLowerCase().includes("research") ||
      taskDescription.toLowerCase().includes("research")

    if (!isResearchTask) {
      return { subTasks: [], shouldDecompose: false }
    }

    // Create sub-agents for research task
    const subTasks: SpawnSubAgentConfig[] = [
      {
        name: "Research Gatherer",
        role: "researcher",
        task: `Gather information for: ${taskDescription}`,
      },
      {
        name: "Content Analyzer",
        role: "reviewer",
        task: `Analyze and synthesize findings for: ${taskDescription}`,
      },
    ]

    return { subTasks, shouldDecompose: true }
  }

  /**
   * Spawn sub-agents for a complex task
   */
  async spawnSubAgentsForTask(
    taskName: string,
    taskDescription: string
  ): Promise<SubAgentResult[]> {
    if (!this.config.useSubAgents) return []

    const pool = getAgentPool()
    const decomposition = this.decomposeTask(taskName, taskDescription)

    if (!decomposition.shouldDecompose) return []

    const subTasks = decomposition.subTasks.slice(0, this.config.maxSubAgentsPerRun)

    pushActivity({
      action: `Orchestrator spawning ${subTasks.length} sub-agents`,
      details: taskName,
      level: "action",
      source: "orchestrator",
      timestamp: Date.now(),
    })

    this.context?.addThought(
      `Decomposing task "${taskName}" into ${subTasks.length} sub-agent tasks`,
      "decision"
    )

    // Spawn sub-agents in parallel
    const results = await pool.spawnParallel(subTasks)

    pushActivity({
      action: `Sub-agents completed`,
      details: `${results.length} agents finished for: ${taskName}`,
      level: "info",
      source: "orchestrator",
      timestamp: Date.now(),
    })

    return results
  }

  async runOnce() {
    if (!this.context) throw new Error("Orchestrator context not set")

    try {
      this.context.addThought("Orchestrator evaluating next actions", "reasoning")

      const proposals = this.proposeCallback
        ? await this.proposeCallback(this.context)
        : await this.defaultPropose(this.context)

      let added = 0
      for (const p of proposals.slice(0, this.config.maxProposalsPerRun)) {
        if (added >= this.config.maxProposalsPerRun) break

        // Check if task should be decomposed into sub-agents
        if (this.config.useSubAgents && p.prompt) {
          const decomposition = this.decomposeTask(p.name, p.description || p.prompt)
          if (decomposition.shouldDecompose) {
            this.context.addThought(
              `Task "${p.name}" will use sub-agents for parallel execution`,
              "decision"
            )
          }
        }

        // allow the host app to decide duplicates; we simply add
        this.context.addScheduledTask({ ...p, enabled: p.enabled ?? true })
        this.context.addActivity(`Orchestrator scheduled: ${p.name}`, p.description)
        added++
      }

      if (added === 0) {
        this.context.addThought("No high-confidence proposals this run", "observation")
      }
    } catch (err) {
      this.context.addThought(`Orchestrator error: ${err instanceof Error ? err.message : String(err)}`, "observation")
    }
  }

  private async defaultPropose(ctx: OrchestratorContext): Promise<Array<Omit<StoreScheduledTask, "id">>> {
    // Very small, safe default: propose a short research summary every 6 hours if idle.
    const state = ctx.getAgentState() as any
    const now = new Date()

    const proposals: Array<Omit<StoreScheduledTask, "id">> = []

    // Basic heuristic: if agent has fewer than 3 scheduled tasks, propose one
    try {
      const scheduled = (state?.scheduledTasks as StoreScheduledTask[]) ?? []
      if (Array.isArray(scheduled) && scheduled.length < 3) {
        proposals.push({
          name: `Autonomous research: ${now.toISOString().slice(0, 10)}`,
          description: "Periodic research summary proposed by Orchestrator",
          schedule: "0 */6 * * *",
          category: "research",
          enabled: true,
          prompt: "Research and summarize an interesting development in science or technology.",
          parameters: {},
        })
      }
    } catch { }

    return proposals
  }
}

let globalOrchestrator: Orchestrator | null = null

export function getOrchestrator(config: Partial<OrchestratorConfig> = {}) {
  if (!globalOrchestrator) globalOrchestrator = new Orchestrator(config)
  return globalOrchestrator
}

