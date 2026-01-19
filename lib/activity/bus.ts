import EventEmitter from "events"

export interface ActivityEvent {
  id?: string
  action: string
  details?: string
  timestamp: number
  status?: "pending" | "running" | "complete" | "error"
}

const emitter = new EventEmitter()
const RECENT_LIMIT = 200
const recent: ActivityEvent[] = []

export function pushActivity(event: ActivityEvent) {
  const e = { ...event, timestamp: event.timestamp ?? Date.now() }
  recent.push(e)
  if (recent.length > RECENT_LIMIT) recent.shift()
  emitter.emit("activity", e)
}

export function subscribeActivity(cb: (ev: ActivityEvent) => void) {
  emitter.on("activity", cb)
  return () => emitter.off("activity", cb)
}

export function getRecentActivities() {
  return [...recent]
}
