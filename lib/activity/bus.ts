/**
 * Browser-compatible activity event bus
 * Uses a simple subscriber pattern instead of Node.js EventEmitter
 */

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
  /** Snapshot URL if applicable */
  imageUrl?: string
  /** Additional structured data */
  metadata?: Record<string, unknown>
}

// Browser-compatible subscriber pattern
type ActivityCallback = (ev: ActivityEvent) => void
const subscribers: Set<ActivityCallback> = new Set()
const RECENT_LIMIT = 200
const recent: ActivityEvent[] = []

/**
 * Push a new activity event to the stream
 * Database persistence is handled separately via API calls
 */
export function pushActivity(event: ActivityEvent) {
  const e: ActivityEvent = {
    ...event,
    id: event.id ?? (typeof crypto !== 'undefined' ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
    timestamp: event.timestamp ?? Date.now(),
    level: event.level ?? "info",
  }
  recent.push(e)
  if (recent.length > RECENT_LIMIT) recent.shift()

  // Notify all subscribers
  subscribers.forEach(cb => {
    try {
      cb(e)
    } catch (err) {
      console.error("Activity subscriber error:", err)
    }
  })

  // Persist to database via API (fire and forget, only on client with fetch available)
  if (typeof fetch !== 'undefined') {
    fetch('/api/activity/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(e),
    }).catch(() => {
      // Silently ignore - in-memory still works
    })
  }
}

/**
 * Subscribe to activity events
 * Returns unsubscribe function
 */
export function subscribeActivity(cb: (ev: ActivityEvent) => void) {
  subscribers.add(cb)
  return () => subscribers.delete(cb)
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
