import { getNextRunTime, matchesCron, parseCron } from "./cron"
import { executeTask, type ExecutorContext } from "./executor"
import { createId } from "@/lib/utils/id"
import type { 
  ScheduledTask, 
  TaskExecution, 
  SchedulerState, 
  SchedulerConfig,
} from "./types"

export * from "./types"
export * from "./cron"
export { executeTask } from "./executor"
export type { ExecutorContext } from "./executor"

export class Scheduler {
  private state: SchedulerState = {
    isRunning: false,
    lastCheck: null,
    currentExecution: null,
    executions: [],
  }
  
  private config: SchedulerConfig
  private intervalId: ReturnType<typeof setInterval> | null = null
  private tasks: Map<string, ScheduledTask> = new Map()
  private listeners: Set<(state: SchedulerState) => void> = new Set()
  private context: ExecutorContext | null = null

  constructor(config: Partial<SchedulerConfig> = {}) {
    this.config = {
      checkInterval: config.checkInterval ?? 60000,
      maxConcurrent: config.maxConcurrent ?? 1,
      autoStart: config.autoStart ?? false,
      retryOnError: config.retryOnError ?? false,
      maxRetries: config.maxRetries ?? 3,
    }
  }

  setContext(context: ExecutorContext): void {
    this.context = context
  }

  subscribe(listener: (state: SchedulerState) => void): () => void {
    this.listeners.add(listener)
    listener(this.state)
    return () => this.listeners.delete(listener)
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.state)
    }
  }

  private updateState(updates: Partial<SchedulerState>): void {
    this.state = { ...this.state, ...updates }
    this.notify()
  }

  start(): void {
    if (this.state.isRunning) return
    
    this.updateState({ isRunning: true })
    
    this.check()
    
    this.intervalId = setInterval(() => {
      this.check()
    }, this.config.checkInterval)
  }

  stop(): void {
    if (!this.state.isRunning) return
    
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    
    this.updateState({ isRunning: false })
  }

  setTasks(tasks: ScheduledTask[]): void {
    this.tasks.clear()
    for (const task of tasks) {
      this.tasks.set(task.id, task)
    }
  }

  addTask(task: ScheduledTask): void {
    const nextRun = getNextRunTime(task.schedule)
    this.tasks.set(task.id, { ...task, nextRun: nextRun ?? undefined })
  }

  removeTask(taskId: string): void {
    this.tasks.delete(taskId)
  }

  updateTask(taskId: string, updates: Partial<ScheduledTask>): void {
    const task = this.tasks.get(taskId)
    if (task) {
      const updated = { ...task, ...updates }
      if (updates.schedule) {
        updated.nextRun = getNextRunTime(updates.schedule) ?? undefined
      }
      this.tasks.set(taskId, updated)
    }
  }

  getTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values())
  }

  getState(): SchedulerState {
    return this.state
  }

  async check(): Promise<void> {
    const now = new Date()
    this.updateState({ lastCheck: now })

    if (this.state.currentExecution) {
      return
    }

    const dueTasks = this.getDueTasks(now)
    
    for (const task of dueTasks) {
      await this.executeTask(task)
    }
  }

  private getDueTasks(now: Date): ScheduledTask[] {
    const due: ScheduledTask[] = []
    
    for (const task of this.tasks.values()) {
      if (!task.enabled) continue
      
      const cron = parseCron(task.schedule)
      if (!cron) continue
      
      if (matchesCron(cron, now)) {
        if (!task.lastRun || now.getTime() - task.lastRun.getTime() > 60000) {
          due.push(task)
        }
      }
    }
    
    return due
  }

  async executeTask(task: ScheduledTask): Promise<TaskExecution> {
    if (!this.context) {
      throw new Error("Scheduler context not set")
    }

    const execution: TaskExecution = {
      id: createId(),
      taskId: task.id,
      taskName: task.name,
      startTime: new Date(),
      status: "running",
    }

    this.updateState({ currentExecution: execution })

    try {
      const result = await executeTask(task, this.context)
      
      execution.endTime = new Date()
      execution.status = "complete"
      execution.result = result

      this.tasks.set(task.id, {
        ...task,
        lastRun: new Date(),
        lastStatus: "complete",
        runCount: task.runCount + 1,
        nextRun: getNextRunTime(task.schedule) ?? undefined,
      })

    } catch (error) {
      execution.endTime = new Date()
      execution.status = "error"
      execution.error = error instanceof Error ? error.message : "Unknown error"

      this.tasks.set(task.id, {
        ...task,
        lastRun: new Date(),
        lastStatus: "error",
        lastError: execution.error,
        runCount: task.runCount + 1,
        nextRun: getNextRunTime(task.schedule) ?? undefined,
      })
    }

    this.updateState({
      currentExecution: null,
      executions: [...this.state.executions, execution].slice(-100),
    })

    return execution
  }

  async runNow(taskId: string): Promise<TaskExecution | null> {
    const task = this.tasks.get(taskId)
    if (!task) return null

    if (this.state.currentExecution) {
      if (this.state.currentExecution.taskId === taskId) {
        return this.state.currentExecution
      }
      return null
    }
    
    return this.executeTask(task)
  }

  getNextRunTimes(): Array<{ task: ScheduledTask; nextRun: Date }> {
    const results: Array<{ task: ScheduledTask; nextRun: Date }> = []
    
    for (const task of this.tasks.values()) {
      if (!task.enabled) continue
      
      const nextRun = task.nextRun ?? getNextRunTime(task.schedule)
      if (nextRun) {
        results.push({ task, nextRun })
      }
    }
    
    return results.sort((a, b) => a.nextRun.getTime() - b.nextRun.getTime())
  }
}

let globalScheduler: Scheduler | null = null

export function getScheduler(): Scheduler {
  if (!globalScheduler) {
    globalScheduler = new Scheduler()
  }
  return globalScheduler
}
