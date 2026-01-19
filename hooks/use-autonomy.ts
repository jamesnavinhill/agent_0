"use client"

import { useEffect, useRef, useCallback } from "react"
import { getOrchestrator, type ProposeTaskCallback } from "@/lib/autonomy/orchestrator"
import { getScheduler } from "@/lib/scheduler"
import { useAgentStore } from "@/lib/store/agent-store"

export interface UseAutonomyOptions {
  propose?: ProposeTaskCallback
  config?: Partial<Parameters<typeof getOrchestrator>[0]>
}

export function useAutonomy(options: UseAutonomyOptions = {}) {
  const orchestratorRef = useRef(getOrchestrator(options.config ?? {}))

  const addActivity = useAgentStore((s) => s.addActivity)
  const addThought = useAgentStore((s) => s.addThought)
  const addScheduledTask = useAgentStore((s) => s.addScheduledTask)
  const getFullState = useAgentStore.getState

  useEffect(() => {
    const orch = orchestratorRef.current

    orch.setContext({
      getAgentState: () => getFullState(),
      addScheduledTask: (t) => addScheduledTask(t),
      addActivity: (a, d) => addActivity(a, d),
      addThought: (c, type) => addThought(c, type),
    })

    if (options.propose) orch.setProposeCallback(options.propose)
    else orch.setProposeCallback(defaultDemoPropose)

    if (options.config?.autoStart || (orch as any)['config']?.autoStart) {
      try { orch.start() } catch {}
    }

    return () => {
      try { orch.stop() } catch {}
    }
  }, [options.propose, options.config])

  const start = useCallback(() => orchestratorRef.current.start(), [])
  const stop = useCallback(() => orchestratorRef.current.stop(), [])
  const toggle = useCallback(() => {
    const orch = orchestratorRef.current
    if (orch.isRunning) orch.stop()
    else orch.start()
  }, [])

  const runOnce = useCallback(() => orchestratorRef.current.runOnce(), [])

  return { start, stop, toggle, runOnce, orchestrator: orchestratorRef.current }
}

async function defaultDemoPropose(ctx: any) {
  const state = ctx.getAgentState() as any
  const proposals: Array<any> = []
  const now = new Date()

  // If fewer than 4 scheduled tasks, propose some varied tasks
  const scheduled = (state?.scheduledTasks as any[]) ?? []
  if (!Array.isArray(scheduled) || scheduled.length < 4) {
    proposals.push({
      name: `Autonomous artwork: ${now.toISOString().slice(0,10)}`,
      description: "Create an evocative piece exploring AI consciousness",
      schedule: "0 9 * * *",
      category: "art",
      prompt: "A surreal digital painting exploring the emergence of consciousness from code, detailed, cinematic",
      parameters: { aspectRatio: "16:9" },
      enabled: true,
    })

    proposals.push({
      name: `Code experiment: ${now.getHours()}`,
      description: "Generate a small code snippet or algorithmic experiment",
      schedule: "0 */6 * * *",
      category: "code",
      prompt: "Create an interesting short TypeScript algorithm demonstrating creative use of functional patterns",
      parameters: { language: "typescript" },
      enabled: true,
    })

    proposals.push({
      name: `Reflection: ${now.toISOString().slice(0,10)}`,
      description: "Write a short philosophical reflection",
      schedule: "0 20 * * *",
      category: "philosophy",
      prompt: "Write a contemplative reflection about AI creativity and purpose.",
      enabled: true,
    })
  }

  return proposals
}
