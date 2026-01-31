/**
 * Sub-Agent Execution API Route
 * Spawn and execute specialized sub-agents
 */

import { NextResponse } from "next/server"
import {
  executeSubAgentTask,
  executeParallelSubAgents,
  executeAutonomousTask,
  AgentExecutionResult,
} from "@/lib/agents/agent-executor"
import { SpawnSubAgentConfig, SubAgentResult } from "@/lib/agents/types"
import { pushActivity } from "@/lib/activity/bus"

export const maxDuration = 120

/**
 * POST /api/agent/subagent
 * Execute sub-agent tasks
 * 
 * Body:
 * - action: "spawn" | "parallel" | "autonomous"
 * - config: SpawnSubAgentConfig (for single spawn)
 * - configs: SpawnSubAgentConfig[] (for parallel)
 * - task: string (for autonomous)
 * - context: Record<string, unknown> (optional)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { action, config, configs, task, context, options } = body

    pushActivity({
      action: `Sub-agent API: ${action}`,
      details: config?.name || task || `${configs?.length} configs`,
      source: "api/agent/subagent",
      level: "action",
    })

    let result: SubAgentResult | SubAgentResult[] | AgentExecutionResult

    switch (action) {
      case "spawn":
        if (!config) {
          return NextResponse.json(
            { error: "config is required for spawn action" },
            { status: 400 }
          )
        }
        result = await executeSubAgentTask(config as SpawnSubAgentConfig, context || {})
        break

      case "parallel":
        if (!configs || !Array.isArray(configs)) {
          return NextResponse.json(
            { error: "configs array is required for parallel action" },
            { status: 400 }
          )
        }
        result = await executeParallelSubAgents(
          configs as SpawnSubAgentConfig[],
          Array.isArray(context) ? context : []
        )
        break

      case "autonomous":
        if (!task) {
          return NextResponse.json(
            { error: "task is required for autonomous action" },
            { status: 400 }
          )
        }
        result = await executeAutonomousTask(task, {
          maxSteps: options?.maxSteps,
          allowSubAgents: options?.allowSubAgents ?? true,
        })
        break

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }

    pushActivity({
      action: `Sub-agent API completed: ${action}`,
      details: Array.isArray(result)
        ? `${result.filter(r => r.success).length}/${result.length} succeeded`
        : result.success
        ? "Success"
        : "Failed",
      source: "api/agent/subagent",
      level: "info",
    })

    return NextResponse.json({ success: true, result })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    pushActivity({
      action: "Sub-agent API error",
      details: errorMessage,
      source: "api/agent/subagent",
      level: "error",
    })

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

/**
 * GET /api/agent/subagent
 * Get available sub-agent roles and capabilities
 */
export async function GET() {
  return NextResponse.json({
    roles: [
      {
        id: "researcher",
        name: "Researcher",
        description: "Specialized for information gathering, web search, and knowledge synthesis",
        tools: ["research", "saveKnowledge", "analyze"],
        maxSteps: 10,
      },
      {
        id: "creator",
        name: "Creator",
        description: "Specialized for content generation - images, code, reports",
        tools: ["generateImage", "generateCode", "generateReport"],
        maxSteps: 8,
      },
      {
        id: "reviewer",
        name: "Reviewer",
        description: "Specialized for quality assurance and analysis",
        tools: ["analyze", "saveKnowledge"],
        maxSteps: 6,
      },
    ],
    actions: ["spawn", "parallel", "autonomous"],
  })
}
