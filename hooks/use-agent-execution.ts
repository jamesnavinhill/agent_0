/**
 * React hook for AI SDK agent execution with real-time visibility
 */

"use client"

import { useState, useCallback, useRef } from "react"
import { useAgentStore } from "@/lib/store/agent-store"

/**
 * Step information from agent execution
 */
export interface AgentStep {
  stepNumber: number
  type: "text" | "tool-call" | "tool-result"
  content?: string
  toolName?: string
  toolInput?: unknown
  toolOutput?: unknown
  timestamp: number
}

/**
 * Tool call record
 */
export interface ToolCall {
  id: string
  name: string
  input: unknown
  output?: unknown
  status: "pending" | "executing" | "complete" | "error"
  timestamp: number
}

/**
 * Sub-agent event from execution
 */
export interface SubAgentUpdate {
  type: "spawned" | "progress" | "completed" | "error"
  agent: {
    id: string
    name: string
    role: "researcher" | "creator" | "executor" | "reviewer"
    status: "idle" | "working" | "complete" | "error"
    progress?: number
    task?: string
    error?: string
  }
}

/**
 * Execution result
 */
export interface ExecutionResult {
  success: boolean
  result?: string
  error?: string
  duration: number
  stepCount: number
  toolCallCount: number
}

/**
 * Hook return type
 */
export interface UseAgentExecutionReturn {
  // State
  isExecuting: boolean
  steps: AgentStep[]
  toolCalls: ToolCall[]
  subAgents: SubAgentUpdate["agent"][]
  result: ExecutionResult | null
  error: string | null

  // Actions
  execute: (task: string, options?: ExecuteOptions) => Promise<ExecutionResult | null>
  cancel: () => void
  reset: () => void
}

interface ExecuteOptions {
  autonomous?: boolean
  maxSteps?: number
}

/**
 * Hook for executing agents with real-time visibility
 */
export function useAgentExecution(): UseAgentExecutionReturn {
  const [isExecuting, setIsExecuting] = useState(false)
  const [steps, setSteps] = useState<AgentStep[]>([])
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([])
  const [subAgents, setSubAgents] = useState<SubAgentUpdate["agent"][]>([])
  const [result, setResult] = useState<ExecutionResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)
  const { addThought, addActivity, setState } = useAgentStore()

  const reset = useCallback(() => {
    setSteps([])
    setToolCalls([])
    setSubAgents([])
    setResult(null)
    setError(null)
  }, [])

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsExecuting(false)
    setState("idle")
    addThought("Execution cancelled by user", "action")
  }, [setState, addThought])

  const execute = useCallback(
    async (task: string, options: ExecuteOptions = {}): Promise<ExecutionResult | null> => {
      reset()
      setIsExecuting(true)
      setState("thinking")
      addThought(`Starting task: ${task}`, "action")
      addActivity("Agent execution started", task)

      abortControllerRef.current = new AbortController()

      try {
        const response = await fetch("/api/agent/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            task,
            autonomous: options.autonomous ?? false,
            maxSteps: options.maxSteps ?? 15,
          }),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        if (!response.body) {
          throw new Error("No response body")
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() || ""

          for (const line of lines) {
            const trimmed = line.trim()
            if (trimmed.startsWith("data:")) {
              const data = trimmed.slice(5).trim()
              if (data === "[DONE]") continue

              try {
                const event = JSON.parse(data)
                handleStreamEvent(event)
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }

        return result
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          setError("Execution cancelled")
          return null
        }

        const errorMessage = err instanceof Error ? err.message : "Unknown error"
        setError(errorMessage)
        setState("error")
        addThought(`Execution failed: ${errorMessage}`, "observation")
        addActivity("Agent execution failed", errorMessage)
        return null
      } finally {
        setIsExecuting(false)
        abortControllerRef.current = null
        setState("idle")
      }

      function handleStreamEvent(event: { type: string; data: unknown; timestamp: number }) {
        switch (event.type) {
          case "status":
            addThought(`Status: ${(event.data as any).status}`, "observation")
            break

          case "step":
            const stepData = event.data as AgentStep
            setSteps((prev) => [...prev, { ...stepData, timestamp: event.timestamp }])

            if (stepData.type === "text" && stepData.content) {
              addThought(stepData.content.slice(0, 200), "reasoning")
            } else if (stepData.type === "tool-call" && stepData.toolName) {
              setState("creating")
              addThought(`Using tool: ${stepData.toolName}`, "action")
            }
            break

          case "tool-call":
            const toolData = event.data as ToolCall
            setToolCalls((prev) => {
              const existing = prev.findIndex((tc) => tc.id === toolData.id)
              if (existing >= 0) {
                const updated = [...prev]
                updated[existing] = { ...toolData, timestamp: event.timestamp }
                return updated
              }
              return [...prev, { ...toolData, timestamp: event.timestamp }]
            })
            addActivity(`Tool call: ${toolData.name}`, JSON.stringify(toolData.input).slice(0, 100))
            break

          case "subagent":
            const subAgentData = event.data as SubAgentUpdate
            setSubAgents((prev) => {
              const existing = prev.findIndex((sa) => sa.id === subAgentData.agent.id)
              if (existing >= 0) {
                const updated = [...prev]
                updated[existing] = subAgentData.agent
                return updated
              }
              return [...prev, subAgentData.agent]
            })

            if (subAgentData.type === "spawned") {
              addThought(`Spawned sub-agent: ${subAgentData.agent.name}`, "action")
            } else if (subAgentData.type === "completed") {
              addThought(`Sub-agent completed: ${subAgentData.agent.name}`, "observation")
            }
            break

          case "complete":
            const resultData = event.data as ExecutionResult
            setResult(resultData)
            setState("idle")
            addThought(
              resultData.success
                ? `Completed in ${resultData.duration}ms with ${resultData.stepCount} steps`
                : `Failed: ${resultData.error}`,
              resultData.success ? "observation" : "observation"
            )
            addActivity(
              "Agent execution completed",
              `${resultData.stepCount} steps, ${resultData.toolCallCount} tool calls`
            )
            break

          case "error":
            const errorData = event.data as { error: string }
            setError(errorData.error)
            setState("error")
            addThought(`Error: ${errorData.error}`, "observation")
            break
        }
      }
    },
    [reset, setState, addThought, addActivity, result]
  )

  return {
    isExecuting,
    steps,
    toolCalls,
    subAgents,
    result,
    error,
    execute,
    cancel,
    reset,
  }
}
