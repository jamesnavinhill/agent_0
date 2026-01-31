/**
 * Agent Execution Stream API Route
 * Server-Sent Events for real-time visibility into agent execution
 */

import {
  executeOrchestrator,
  executeAutonomousTask,
  AgentStep,
  ToolCallRecord,
} from "@/lib/agents/agent-executor"
import { SubAgentEvent } from "@/lib/agents/types"
import { pushActivity } from "@/lib/activity/bus"

export const maxDuration = 120

/**
 * POST /api/agent/stream
 * Execute agent with SSE streaming for real-time updates
 * 
 * Body:
 * - task: string - The task to execute
 * - autonomous: boolean - Whether to run in autonomous mode
 * - maxSteps: number - Maximum steps (default: 15)
 */
export async function POST(req: Request) {
  try {
    const { task, autonomous, maxSteps } = await req.json()

    if (!task) {
      return Response.json({ error: "task is required" }, { status: 400 })
    }

    pushActivity({
      action: "Agent stream execution started",
      details: task.slice(0, 100),
      source: "api/agent/stream",
      level: "action",
      metadata: { autonomous },
    })

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (type: string, data: unknown) => {
          const event = JSON.stringify({ type, data, timestamp: Date.now() })
          controller.enqueue(encoder.encode(`data: ${event}\n\n`))
        }

        // Send initial status
        sendEvent("status", { status: "starting", task })

        try {
          if (autonomous) {
            // Autonomous execution with sub-agent support
            const result = await executeAutonomousTask(task, {
              maxSteps: maxSteps ?? 15,
              allowSubAgents: true,
              onStep: (step: AgentStep) => {
                sendEvent("step", {
                  stepNumber: step.stepNumber,
                  type: step.type,
                  content: step.content,
                  toolName: step.toolName,
                  toolInput: step.toolInput,
                  toolOutput: step.toolOutput,
                })
              },
              onToolCall: (toolCall: ToolCallRecord) => {
                sendEvent("tool-call", {
                  id: toolCall.id,
                  name: toolCall.name,
                  input: toolCall.input,
                  status: toolCall.status,
                })

                if (toolCall.name === "delegate") {
                  sendEvent("delegate", {
                    id: toolCall.id,
                    input: toolCall.input,
                  })
                }
              },
              onSubAgentEvent: (event: SubAgentEvent) => {
                sendEvent("subagent", {
                  type: event.type,
                  agent: {
                    id: event.agent.id,
                    name: event.agent.name,
                    role: event.agent.role,
                    status: event.agent.status,
                    progress: event.agent.progress,
                    task: event.agent.task,
                    error: event.agent.error,
                  },
                })
              },
            })

            // Send final result
            sendEvent("complete", {
              success: result.success,
              result: result.result,
              error: result.error,
              duration: result.duration,
              stepCount: result.steps.length,
              toolCallCount: result.toolCalls.length,
            })
          } else {
            // Standard orchestrator execution
            const result = await executeOrchestrator(task, {
              autonomous: false,
              maxSteps: maxSteps ?? 15,
              onStep: (step: AgentStep) => {
                sendEvent("step", {
                  stepNumber: step.stepNumber,
                  type: step.type,
                  content: step.content,
                  toolName: step.toolName,
                  toolInput: step.toolInput,
                  toolOutput: step.toolOutput,
                })
              },
              onToolCall: (toolCall: ToolCallRecord) => {
                sendEvent("tool-call", {
                  id: toolCall.id,
                  name: toolCall.name,
                  input: toolCall.input,
                  status: toolCall.status,
                })

                if (toolCall.name === "delegate") {
                  sendEvent("delegate", {
                    id: toolCall.id,
                    input: toolCall.input,
                  })
                }
              },
            })

            // Send final result
            sendEvent("complete", {
              success: result.success,
              result: result.result,
              error: result.error,
              duration: result.duration,
              stepCount: result.steps.length,
              toolCallCount: result.toolCalls.length,
            })
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error"
          sendEvent("error", { error: errorMessage })

          pushActivity({
            action: "Agent stream execution failed",
            details: errorMessage,
            source: "api/agent/stream",
            level: "error",
          })
        }

        // Send done signal
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`))
        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return Response.json({ error: errorMessage }, { status: 500 })
  }
}
