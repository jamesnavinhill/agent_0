import EventEmitter from "events"
import { saveActivity } from "./db-store"

/**
 * Log levels for activity events
 */
export type ActivityLevel = "debug" | "info" | "action" | "thought" | "error"

/**
 * Enhanced activity event with level, source tracking, and metadata
 */
export interface ActivityEvent {
  id?: string
  action: string
  details?: string
  timestamp: number
  status?: "pending" | "running" | "complete" | "error"
  /** Log level for filtering and display */
  level?: ActivityLevel
  /** Component or agent that generated this event */
  source?: string
  /** Additional structured data */
  metadata?: Record<string, unknown>
}

const emitter = new EventEmitter()
const RECENT_LIMIT = 200
const recent: ActivityEvent[] = []

/**
 * Push a new activity event to the stream
 * Also persists to database if configured
 */
export function pushActivity(event: ActivityEvent) {
  const e: ActivityEvent = {
    ...event,
    id: event.id ?? crypto.randomUUID(),
    timestamp: event.timestamp ?? Date.now(),
    level: event.level ?? "info",
  }
  recent.push(e)
  if (recent.length > RECENT_LIMIT) recent.shift()
  emitter.emit("activity", e)

  // Persist to database asynchronously (fire and forget)
  saveActivity(e).catch(() => {
    // Silently ignore DB errors - in-memory still works
  })
}

/**
 * Subscribe to activity events
 * Returns unsubscribe function
 */
export function subscribeActivity(cb: (ev: ActivityEvent) => void) {
  emitter.on("activity", cb)
  return () => emitter.off("activity", cb)
}

/**
 * Get recent activities, optionally filtered by level
 */
export function getRecentActivities(filter?: {
  level?: ActivityLevel
  source?: string
  limit?: number
}): ActivityEvent[] {
  let result = [...recent]

  if (filter?.level) {
    result = result.filter((e) => e.level === filter.level)
  }
  if (filter?.source) {
    result = result.filter((e) => e.source === filter.source)
  }
  if (filter?.limit) {
    result = result.slice(-filter.limit)
  }

  return result
}

/**
 * Clear all recent activities
 */
export function clearActivities() {
  recent.length = 0
}
