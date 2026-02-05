"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useAgentStore, type ScheduledTask } from "@/lib/store/agent-store"
import { useSettings } from "@/hooks/use-settings"
import {
  Scheduler,
  getScheduler,
  type SchedulerState,
  type TaskExecution,
  getNextRunTime,
} from "@/lib/scheduler"

interface UseSchedulerReturn {
  isRunning: boolean
  lastCheck: Date | null
  currentExecution: TaskExecution | null
  executions: TaskExecution[]
  start: () => void
  stop: () => void
  toggle: () => void
  runTask: (taskId: string) => Promise<TaskExecution | null>
  getNextRuns: () => Array<{ task: ScheduledTask; nextRun: Date }>
}

export function useScheduler(): UseSchedulerReturn {
  const schedulerRef = useRef<Scheduler | null>(null)
  const [state, setState] = useState<SchedulerState>({
    isRunning: false,
    lastCheck: null,
    currentExecution: null,
    executions: [],
  })

  const {
    scheduledTasks,
    addActivity,
    updateActivity,
    addThought,
    addOutput,
    setState: setAgentState,
  } = useAgentStore()
  const { settings } = useSettings()

  useEffect(() => {
    const scheduler = getScheduler()
    schedulerRef.current = scheduler

    scheduler.setContext({
      addActivity,
      updateActivity,
      addThought,
      addOutput,
      setState: setAgentState,
      settings: {
        imageModel: settings.imageModel,
        imageAspectRatio: settings.imageAspectRatio,
        videoModel: settings.videoModel,
        videoAspectRatio: settings.videoAspectRatio,
        videoResolution: settings.videoResolution,
        videoDurationSeconds: settings.videoDurationSeconds,
      },
    })

    const mappedTasks = (scheduledTasks ?? []).map(t => ({
      ...t,
      category: (t.category ?? "custom") as "art" | "video" | "flow" | "music" | "code" | "philosophy" | "research" | "blog" | "game" | "social" | "custom",
      runCount: 0,
    }))
    scheduler.setTasks(mappedTasks)

    const unsubscribe = scheduler.subscribe(setState)

    return () => {
      unsubscribe()
    }
  }, [
    addActivity,
    updateActivity,
    addThought,
    addOutput,
    setAgentState,
    settings.imageModel,
    settings.imageAspectRatio,
    settings.videoModel,
    settings.videoAspectRatio,
    settings.videoResolution,
    settings.videoDurationSeconds,
  ])

  useEffect(() => {
    if (!schedulerRef.current) return

    const mappedTasks = (scheduledTasks ?? []).map(t => ({
      ...t,
      category: (t.category ?? "custom") as "art" | "video" | "flow" | "music" | "code" | "philosophy" | "research" | "blog" | "game" | "social" | "custom",
      runCount: 0,
      nextRun: t.nextRun ?? getNextRunTime(t.schedule) ?? undefined,
    }))
    schedulerRef.current.setTasks(mappedTasks)
  }, [scheduledTasks])

  const start = useCallback(() => {
    schedulerRef.current?.start()
    addThought("Autonomous scheduler activated", "decision")
    addActivity("Scheduler started", "Now monitoring scheduled tasks")
  }, [addThought, addActivity])

  const stop = useCallback(() => {
    schedulerRef.current?.stop()
    addThought("Autonomous scheduler paused", "decision")
    addActivity("Scheduler stopped", "Scheduled tasks paused")
  }, [addThought, addActivity])

  const toggle = useCallback(() => {
    if (state.isRunning) {
      stop()
    } else {
      start()
    }
  }, [state.isRunning, start, stop])

  const runTask = useCallback(async (taskId: string): Promise<TaskExecution | null> => {
    if (!schedulerRef.current) return null

    addThought("Manually triggering scheduled task", "action")
    return schedulerRef.current.runNow(taskId)
  }, [addThought])

  const getNextRuns = useCallback(() => {
    if (!schedulerRef.current) return []
    return schedulerRef.current.getNextRunTimes() as Array<{ task: ScheduledTask; nextRun: Date }>
  }, [])

  return {
    isRunning: state.isRunning,
    lastCheck: state.lastCheck,
    currentExecution: state.currentExecution,
    executions: state.executions,
    start,
    stop,
    toggle,
    runTask,
    getNextRuns,
  }
}
