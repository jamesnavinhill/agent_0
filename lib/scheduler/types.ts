export type TaskCategory =
  | "art"
  | "music"
  | "code"
  | "philosophy"
  | "research"
  | "blog"
  | "game"
  | "social"
  | "custom"
  | "browser"
  | "video"

export type TaskStatus =
  | "pending"
  | "running"
  | "complete"
  | "error"
  | "skipped"

export interface ScheduledTask {
  id: string
  name: string
  description?: string
  schedule: string
  category: TaskCategory
  enabled: boolean
  nextRun?: Date
  lastRun?: Date
  lastStatus?: TaskStatus
  lastError?: string
  runCount: number
  prompt?: string
  parameters?: Record<string, unknown>
}

export interface TaskExecution {
  id: string
  taskId: string
  taskName: string
  startTime: Date
  endTime?: Date
  status: TaskStatus
  result?: TaskResult
  error?: string
}

export interface TaskResult {
  type: "image" | "code" | "text" | "music" | "video"
  content: string
  metadata?: Record<string, unknown>
}

export interface SchedulerState {
  isRunning: boolean
  lastCheck: Date | null
  currentExecution: TaskExecution | null
  executions: TaskExecution[]
}

export interface SchedulerConfig {
  checkInterval: number
  maxConcurrent: number
  autoStart: boolean
  retryOnError: boolean
  maxRetries: number
}

export const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  checkInterval: 60000,
  maxConcurrent: 1,
  autoStart: false,
  retryOnError: false,
  maxRetries: 3,
}
