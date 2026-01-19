/**
 * Centralized logging utility for Agent Zero
 * Integrates with activity bus for real-time visibility
 */

import { pushActivity, type ActivityEvent } from "@/lib/activity/bus"

export type LogLevel = "debug" | "info" | "action" | "thought" | "warn" | "error"

export interface LogEntry {
    timestamp: number
    level: LogLevel
    source: string
    message: string
    metadata?: Record<string, unknown>
}

// Color codes for console output
const levelColors: Record<LogLevel, string> = {
    debug: "\x1b[90m",   // gray
    info: "\x1b[36m",    // cyan
    action: "\x1b[32m",  // green
    thought: "\x1b[35m", // magenta
    warn: "\x1b[33m",    // yellow
    error: "\x1b[31m",   // red
}

const resetColor = "\x1b[0m"

// In-memory log buffer for debugging
const LOG_BUFFER_SIZE = 500
const logBuffer: LogEntry[] = []

// Log level priority for filtering
const levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    thought: 2,
    action: 3,
    warn: 4,
    error: 5,
}

// Configurable minimum log level
let minLevel: LogLevel = "debug"

export function setLogLevel(level: LogLevel) {
    minLevel = level
}

export function getLogLevel(): LogLevel {
    return minLevel
}

function shouldLog(level: LogLevel): boolean {
    return levelPriority[level] >= levelPriority[minLevel]
}

function formatLogMessage(entry: LogEntry): string {
    const time = new Date(entry.timestamp).toISOString().slice(11, 23)
    const levelStr = entry.level.toUpperCase().padEnd(7)
    const meta = entry.metadata ? ` ${JSON.stringify(entry.metadata)}` : ""
    return `[${time}] ${levelStr} [${entry.source}] ${entry.message}${meta}`
}

function log(level: LogLevel, source: string, message: string, metadata?: Record<string, unknown>) {
    if (!shouldLog(level)) return

    const entry: LogEntry = {
        timestamp: Date.now(),
        level,
        source,
        message,
        metadata,
    }

    // Add to buffer
    logBuffer.push(entry)
    if (logBuffer.length > LOG_BUFFER_SIZE) {
        logBuffer.shift()
    }

    // Console output
    const color = levelColors[level]
    console.log(`${color}${formatLogMessage(entry)}${resetColor}`)

    // Push to activity bus for action/thought/error levels
    if (level === "action" || level === "thought" || level === "error") {
        const activityEvent: ActivityEvent = {
            action: level === "thought" ? `💭 ${message}` : level === "error" ? `❌ ${message}` : `⚡ ${message}`,
            details: metadata ? JSON.stringify(metadata) : undefined,
            timestamp: entry.timestamp,
            status: level === "error" ? "error" : "complete",
        }
        pushActivity(activityEvent)
    }

    // Persist error logs to localStorage
    if (level === "error") {
        try {
            const errorLogs = JSON.parse(localStorage.getItem("agent_error_logs") || "[]")
            errorLogs.push(entry)
            if (errorLogs.length > 50) errorLogs.shift()
            localStorage.setItem("agent_error_logs", JSON.stringify(errorLogs))
        } catch {
            // Ignore localStorage errors
        }
    }
}

// Create a logger instance for a specific source
export function createLogger(source: string) {
    return {
        debug: (message: string, metadata?: Record<string, unknown>) => log("debug", source, message, metadata),
        info: (message: string, metadata?: Record<string, unknown>) => log("info", source, message, metadata),
        action: (message: string, metadata?: Record<string, unknown>) => log("action", source, message, metadata),
        thought: (message: string, metadata?: Record<string, unknown>) => log("thought", source, message, metadata),
        warn: (message: string, metadata?: Record<string, unknown>) => log("warn", source, message, metadata),
        error: (message: string, metadata?: Record<string, unknown>) => log("error", source, message, metadata),
    }
}

// Get recent logs for debugging
export function getRecentLogs(count: number = 100, level?: LogLevel): LogEntry[] {
    let logs = logBuffer.slice(-count)
    if (level) {
        logs = logs.filter((l) => levelPriority[l.level] >= levelPriority[level])
    }
    return logs
}

// Get error logs from localStorage
export function getPersistedErrorLogs(): LogEntry[] {
    try {
        return JSON.parse(localStorage.getItem("agent_error_logs") || "[]")
    } catch {
        return []
    }
}

// Clear log buffer
export function clearLogs() {
    logBuffer.length = 0
}

// Default logger instance
export const logger = createLogger("Agent")
