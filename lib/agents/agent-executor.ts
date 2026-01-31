/**
 * Agent Executor Service
 * Bridges AI SDK agents with the existing sub-agent pool and activity system
 */

import {
  orchestratorAgent,
  researcherAgent,
  creatorAgent,
  reviewerAgent,
  getSubAgent,
} from "./ai-sdk-agents"
import {
  SubAgent,
  SubAgentRole,
  SubAgentResult,
  SpawnSubAgentConfig,
  SubAgentEvent,
  SubAgentEventCallback,
} from "./types"
import { pushActivity } from "@/lib/activity/bus"
import { logger } from "@/lib/logging/logger"

const VALID_SUBAGENT_ROLES: SubAgentRole[] = [
  "researcher",
  "creator",
  "executor",
  "reviewer",
  "coder",
]

function isSubAgentRole(role: unknown): role is SubAgentRole {
  return VALID_SUBAGENT_ROLES.includes(role as SubAgentRole)
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== "string") {
    return value
  }

  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function normalizeToolInput(toolCall: Record<string, unknown>): unknown {
  if ("args" in toolCall && toolCall.args !== undefined) {
    return toolCall.args
  }

  if ("arguments" in toolCall && toolCall.arguments !== undefined) {
    return toolCall.arguments
  }

  if ("input" in toolCall && toolCall.input !== undefined) {
    return toolCall.input
  }

  return toolCall
}

/**
 * Result from an AI SDK agent execution with full visibility
 */
export interface AgentExecutionResult {
  agentId: string
  role: SubAgentRole | "orchestrator"
  success: boolean
  result?: string
  error?: string
  steps: AgentStep[]
  toolCalls: ToolCallRecord[]
  duration: number
}

/**
 * Record of a single step in the agent execution
 */
export interface AgentStep {
  stepNumber: number
  type: "text" | "tool-call" | "tool-result"
  content?: string
  toolName?: string
  toolInput?: unknown
  toolOutput?: unknown
  timestamp: Date
}

/**
 * Record of tool calls for visibility
 */
export interface ToolCallRecord {
  id: string
  name: string
  input: unknown
  output?: unknown
  status: "pending" | "executing" | "complete" | "error"
  duration?: number
  timestamp: Date
}

/**
 * Create a sub-agent record for tracking
 */
function createSubAgentRecord(config: SpawnSubAgentConfig): SubAgent {
  return {
    id: crypto.randomUUID(),
    name: config.name,
    role: config.role,
    status: "idle",
    task: config.task,
    progress: 0,
    startedAt: new Date(),
  }
}

/**
 * Execute the orchestrator agent with full step visibility
 */
export async function executeOrchestrator(
  prompt: string,
  options: {
    sessionId?: string
    autonomous?: boolean
    maxSteps?: number
    onStep?: (step: AgentStep) => void
    onToolCall?: (toolCall: ToolCallRecord) => void
  } = {}
): Promise<AgentExecutionResult> {
  const startTime = Date.now()
  const steps: AgentStep[] = []
  const toolCalls: ToolCallRecord[] = []
  const agentId = crypto.randomUUID()

  pushActivity({
    action: "Orchestrator execution started",
    details: prompt.slice(0, 100),
    source: "orchestrator",
    level: "action",
    metadata: { agentId, autonomous: options.autonomous },
  })

  try {
    const result = await orchestratorAgent.generate({
      prompt,
      options: {
        sessionId: options.sessionId,
        autonomous: options.autonomous ?? false,
        maxSteps: options.maxSteps ?? 15,
      },
    })

    // Process steps for visibility
    let stepNumber = 0
    for (const step of result.steps) {
      stepNumber++

      // Record text output
      if (step.text) {
        const textStep: AgentStep = {
          stepNumber,
          type: "text",
          content: step.text,
          timestamp: new Date(),
        }
        steps.push(textStep)
        options.onStep?.(textStep)
      }

      // Record tool calls
      for (const toolCall of step.toolCalls || []) {
        const rawInput = normalizeToolInput(toolCall as Record<string, unknown>)
        const parsedInput = parseMaybeJson(rawInput)
        const toolRecord: ToolCallRecord = {
          id: toolCall.toolCallId,
          name: toolCall.toolName,
          input: parsedInput,
          status: "complete",
          timestamp: new Date(),
        }
        toolCalls.push(toolRecord)
        options.onToolCall?.(toolRecord)

        const toolStep: AgentStep = {
          stepNumber,
          type: "tool-call",
          toolName: toolCall.toolName,
          toolInput: parsedInput,
          timestamp: new Date(),
        }
        steps.push(toolStep)
        options.onStep?.(toolStep)
      }

      // Record tool results
      for (const toolResult of step.toolResults || []) {
        const resultStep: AgentStep = {
          stepNumber,
          type: "tool-result",
          toolName: toolResult.toolName,
          toolOutput: "result" in toolResult ? toolResult.result : toolResult,
          timestamp: new Date(),
        }
        steps.push(resultStep)
        options.onStep?.(resultStep)

        // Update the tool call record with output
        const call = toolCalls.find(tc => tc.id === toolResult.toolCallId)
        if (call) {
          call.output = "result" in toolResult ? toolResult.result : toolResult
        }
      }
    }

    const duration = Date.now() - startTime

    pushActivity({
      action: "Orchestrator execution completed",
      details: `${steps.length} steps, ${toolCalls.length} tool calls`,
      source: "orchestrator",
      level: "info",
      metadata: { agentId, duration, stepCount: steps.length },
    })

    return {
      agentId,
      role: "orchestrator",
      success: true,
      result: result.text,
      steps,
      toolCalls,
      duration,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const duration = Date.now() - startTime

    pushActivity({
      action: "Orchestrator execution failed",
      details: errorMessage,
      source: "orchestrator",
      level: "error",
      metadata: { agentId, duration },
    })

    logger.error("Orchestrator execution failed", {
      source: "agent-executor",
      error: errorMessage,
    })

    return {
      agentId,
      role: "orchestrator",
      success: false,
      error: errorMessage,
      steps,
      toolCalls,
      duration,
    }
  }
}

/**
 * Execute a specialized sub-agent with tracking
 */
export async function executeSubAgentTask(
  config: SpawnSubAgentConfig,
  context: Record<string, unknown> = {},
  onEvent?: SubAgentEventCallback
): Promise<SubAgentResult> {
  const startTime = Date.now()
  const agent = createSubAgentRecord(config)

  // Emit spawned event
  agent.status = "working"
  onEvent?.({ type: "spawned", agent, timestamp: new Date() })

  pushActivity({
    action: `Sub-agent spawned: ${config.name}`,
    details: config.task,
    source: config.role,
    level: "action",
    metadata: { agentId: agent.id, role: config.role },
  })

  try {
    // Get the appropriate AI SDK agent
    const aiAgent = getSubAgent(config.role)

    // Build the prompt with context
    let prompt = config.task
    if (Object.keys(context).length > 0) {
      prompt += "\n\n## Context:\n"
      for (const [key, value] of Object.entries(context)) {
        prompt += `- ${key}: ${typeof value === "string" ? value : JSON.stringify(value)}\n`
      }
    }

    // Execute the sub-agent
    agent.progress = 25
    onEvent?.({ type: "progress", agent, timestamp: new Date() })

    const result = await aiAgent.generate({
      prompt,
      options: {
        parentTaskId: agent.id,
        ...(config.role === "researcher" ? { depth: "thorough" } : {}),
        ...(config.role === "creator" ? { outputType: "mixed" } : {}),
        ...(config.role === "reviewer" ? { analysisType: "technical" } : {}),
      } as any,
    })

    agent.progress = 100
    agent.status = "complete"
    agent.result = result.text
    agent.completedAt = new Date()

    onEvent?.({ type: "completed", agent, timestamp: new Date() })

    pushActivity({
      action: `Sub-agent completed: ${config.name}`,
      details: `${result.steps.length} steps executed`,
      source: config.role,
      level: "info",
      metadata: { agentId: agent.id, stepCount: result.steps.length },
    })

    return {
      agentId: agent.id,
      role: config.role,
      success: true,
      result: result.text,
      duration: Date.now() - startTime,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    agent.status = "error"
    agent.error = errorMessage
    agent.completedAt = new Date()

    onEvent?.({ type: "error", agent, timestamp: new Date() })

    pushActivity({
      action: `Sub-agent failed: ${config.name}`,
      details: errorMessage,
      source: config.role,
      level: "error",
      metadata: { agentId: agent.id },
    })

    logger.error(`Sub-agent ${config.name} failed`, {
      source: "agent-executor",
      error: errorMessage,
      role: config.role,
    })

    return {
      agentId: agent.id,
      role: config.role,
      success: false,
      error: errorMessage,
      duration: Date.now() - startTime,
    }
  }
}

/**
 * Execute multiple sub-agents in parallel
 */
export async function executeParallelSubAgents(
  configs: SpawnSubAgentConfig[],
  contexts: Record<string, unknown>[] = [],
  onEvent?: SubAgentEventCallback
): Promise<SubAgentResult[]> {
  pushActivity({
    action: `Spawning ${configs.length} parallel sub-agents`,
    details: configs.map(c => c.name).join(", "),
    source: "agent-executor",
    level: "action",
  })

  const promises = configs.map((config, index) =>
    executeSubAgentTask(config, contexts[index] || {}, onEvent)
  )

  const results = await Promise.all(promises)

  const successCount = results.filter(r => r.success).length

  pushActivity({
    action: `Parallel execution complete`,
    details: `${successCount}/${results.length} successful`,
    source: "agent-executor",
    level: "info",
  })

  return results
}

/**
 * Autonomous task execution - orchestrator decides what to do
 */
export async function executeAutonomousTask(
  taskDescription: string,
  options: {
    maxSteps?: number
    allowSubAgents?: boolean
    onStep?: (step: AgentStep) => void
    onToolCall?: (toolCall: ToolCallRecord) => void
    onSubAgentEvent?: SubAgentEventCallback
  } = {}
): Promise<AgentExecutionResult> {
  pushActivity({
    action: "Autonomous task started",
    details: taskDescription,
    source: "orchestrator",
    level: "action",
  })

  // Execute with orchestrator
  const result = await executeOrchestrator(taskDescription, {
    autonomous: true,
    maxSteps: options.maxSteps ?? 15,
    onStep: options.onStep,
    onToolCall: options.onToolCall,
  })

  // Check if any delegate tool calls were made
  const delegations = result.toolCalls.filter(tc => tc.name === "delegate")

  if (options.allowSubAgents !== false && delegations.length > 0) {
    pushActivity({
      action: "Processing delegated tasks",
      details: `${delegations.length} delegation(s)`,
      source: "orchestrator",
      level: "info",
    })

    // Execute delegated sub-agent tasks
    const subAgentConfigs = delegations
      .map(d => {
        const parsedInput = parseMaybeJson(d.input) as Record<string, unknown> | undefined
        logger.info("Delegate tool call received", {
          source: "agent-executor",
          toolCallId: d.id,
          rawInput: d.input,
          parsedInput,
        })
        const candidateRole = parsedInput?.agentRole ?? parsedInput?.role
        const taskDescription =
          parsedInput?.taskDescription ?? parsedInput?.task ?? parsedInput?.prompt

        if (!isSubAgentRole(candidateRole)) {
          pushActivity({
            action: "Delegated task skipped",
            details: `Invalid role: ${candidateRole ?? "missing"}`,
            source: "orchestrator",
            level: "warning",
          })

          logger.warn("Skipping delegated sub-agent due to invalid role", {
            source: "agent-executor",
            role: candidateRole,
            input: parsedInput,
          })

          return null
        }

        if (!taskDescription || typeof taskDescription !== "string") {
          pushActivity({
            action: "Delegated task skipped",
            details: `Missing task description for ${candidateRole}`,
            source: "orchestrator",
            level: "warning",
          })

          logger.warn("Skipping delegated sub-agent due to missing task description", {
            source: "agent-executor",
            role: candidateRole,
            input: parsedInput,
          })

          return null
        }

        return {
          name: `Delegated ${candidateRole}`,
          role: candidateRole,
          task: taskDescription,
        } satisfies SpawnSubAgentConfig
      })
      .filter(Boolean) as SpawnSubAgentConfig[]

    if (subAgentConfigs.length > 0) {
      await executeParallelSubAgents(subAgentConfigs, [], options.onSubAgentEvent)
    }
  }

  return result
}
