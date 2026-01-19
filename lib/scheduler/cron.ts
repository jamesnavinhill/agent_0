export interface CronFields {
  minute: number[]
  hour: number[]
  dayOfMonth: number[]
  month: number[]
  dayOfWeek: number[]
}

export function parseCron(expression: string): CronFields | null {
  const parts = expression.trim().split(/\s+/)
  if (parts.length !== 5) return null

  try {
    return {
      minute: parseField(parts[0], 0, 59),
      hour: parseField(parts[1], 0, 23),
      dayOfMonth: parseField(parts[2], 1, 31),
      month: parseField(parts[3], 1, 12),
      dayOfWeek: parseField(parts[4], 0, 6),
    }
  } catch {
    return null
  }
}

function parseField(field: string, min: number, max: number): number[] {
  const values: number[] = []

  for (const part of field.split(",")) {
    if (part === "*") {
      for (let i = min; i <= max; i++) values.push(i)
    } else if (part.includes("/")) {
      const [range, step] = part.split("/")
      const stepNum = parseInt(step, 10)
      const start = range === "*" ? min : parseInt(range, 10)
      for (let i = start; i <= max; i += stepNum) {
        values.push(i)
      }
    } else if (part.includes("-")) {
      const [start, end] = part.split("-").map(Number)
      for (let i = start; i <= end; i++) {
        values.push(i)
      }
    } else {
      values.push(parseInt(part, 10))
    }
  }

  return [...new Set(values)].filter(v => v >= min && v <= max).sort((a, b) => a - b)
}

export function matchesCron(cron: CronFields, date: Date): boolean {
  const minute = date.getMinutes()
  const hour = date.getHours()
  const dayOfMonth = date.getDate()
  const month = date.getMonth() + 1
  const dayOfWeek = date.getDay()

  return (
    cron.minute.includes(minute) &&
    cron.hour.includes(hour) &&
    cron.dayOfMonth.includes(dayOfMonth) &&
    cron.month.includes(month) &&
    cron.dayOfWeek.includes(dayOfWeek)
  )
}

export function getNextRunTime(expression: string, from: Date = new Date()): Date | null {
  const cron = parseCron(expression)
  if (!cron) return null

  const next = new Date(from)
  next.setSeconds(0)
  next.setMilliseconds(0)
  next.setMinutes(next.getMinutes() + 1)

  const maxIterations = 366 * 24 * 60
  for (let i = 0; i < maxIterations; i++) {
    if (matchesCron(cron, next)) {
      return next
    }
    next.setMinutes(next.getMinutes() + 1)
  }

  return null
}

export function describeCron(expression: string): string {
  const presets: Record<string, string> = {
    "0 9 * * *": "Daily at 9:00 AM",
    "0 20 * * *": "Daily at 8:00 PM",
    "0 12 * * *": "Daily at 12:00 PM",
    "0 */4 * * *": "Every 4 hours",
    "0 */2 * * *": "Every 2 hours",
    "0 0 * * *": "Daily at midnight",
    "0 0 * * 0": "Weekly on Sunday",
    "0 0 1 * *": "Monthly on the 1st",
    "*/30 * * * *": "Every 30 minutes",
    "*/15 * * * *": "Every 15 minutes",
  }

  if (presets[expression]) {
    return presets[expression]
  }

  const cron = parseCron(expression)
  if (!cron) return expression

  const parts: string[] = []

  if (cron.minute.length === 1 && cron.hour.length === 1) {
    const hour = cron.hour[0]
    const minute = cron.minute[0]
    const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
    parts.push(`at ${time}`)
  }

  if (cron.dayOfWeek.length < 7 && cron.dayOfWeek.length > 0) {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    const dayNames = cron.dayOfWeek.map(d => days[d]).join(", ")
    parts.push(`on ${dayNames}`)
  }

  return parts.length > 0 ? parts.join(" ") : expression
}
